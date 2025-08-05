"""
Custom middleware for secure authentication and rate limiting
"""

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
import json

User = get_user_model()


class CookieJWTAuthentication(MiddlewareMixin):
    """
    Custom middleware to authenticate users using JWT tokens from httpOnly cookies
    """
    
    def process_request(self, request):
        # Skip for certain paths
        skip_paths = ['/admin/', '/static/', '/media/', '/api/auth/login/', '/api/auth/register/']
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Get token from cookie
        token = request.COOKIES.get('access_token')
        
        if token:
            try:
                # Validate token
                UntypedToken(token)
                
                # Decode token to get user info
                from rest_framework_simplejwt.tokens import AccessToken
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Get user
                try:
                    user = User.objects.get(id=user_id)
                    request.user = user
                except User.DoesNotExist:
                    request.user = AnonymousUser()
                    
            except (InvalidToken, TokenError):
                request.user = AnonymousUser()
        else:
            request.user = AnonymousUser()
        
        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses
    """
    
    def process_response(self, request, response):
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # CORS headers for development
        if request.method == 'OPTIONS':
            response['Access-Control-Allow-Origin'] = 'http://localhost:5173'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
        
        return response


class SubscriptionLimitMiddleware(MiddlewareMixin):
    """
    Enforce subscription limits on API usage
    """
    
    def process_request(self, request):
        # Skip for non-API paths
        if not request.path.startswith('/api/'):
            return None
        
        # Skip for authentication endpoints
        auth_paths = ['/api/auth/', '/api/subscription-plans/']
        if any(request.path.startswith(path) for path in auth_paths):
            return None
        
        # Only check for authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                subscription = request.user.subscription
                
                # Check if subscription is active
                if subscription.status not in ['active', 'trial']:
                    return JsonResponse({
                        'error': 'Subscription expired or inactive',
                        'code': 'SUBSCRIPTION_INACTIVE'
                    }, status=402)
                
                # Check transaction limits for transaction creation
                if (request.path.startswith('/api/transactions/') and 
                    request.method == 'POST'):
                    
                    if (subscription.transactions_this_month >= 
                        subscription.plan.max_transactions_per_month):
                        return JsonResponse({
                            'error': 'Monthly transaction limit exceeded',
                            'code': 'TRANSACTION_LIMIT_EXCEEDED',
                            'limit': subscription.plan.max_transactions_per_month
                        }, status=429)
                
                # Check account limits for account creation
                if (request.path.startswith('/api/accounts/') and 
                    request.method == 'POST'):
                    
                    account_count = request.user.accounts.filter(is_active=True).count()
                    if account_count >= subscription.plan.max_accounts:
                        return JsonResponse({
                            'error': 'Maximum accounts limit reached',
                            'code': 'ACCOUNT_LIMIT_EXCEEDED',
                            'limit': subscription.plan.max_accounts
                        }, status=429)
                
            except Exception:
                # If no subscription exists, create a free trial
                from .models import SubscriptionPlan, UserSubscription
                try:
                    free_plan = SubscriptionPlan.objects.get(plan_type='free')
                    UserSubscription.objects.create(
                        user=request.user,
                        plan=free_plan,
                        ai_credits_remaining=free_plan.ai_credits_per_month
                    )
                except Exception:
                    pass
        
        return None


class APILoggingMiddleware(MiddlewareMixin):
    """
    Log API usage for analytics and billing
    """
    
    def process_response(self, request, response):
        # Only log API requests
        if not request.path.startswith('/api/'):
            return response
        
        # Skip logging for certain endpoints
        skip_paths = ['/api/auth/', '/api/ai-usage/']
        if any(request.path.startswith(path) for path in skip_paths):
            return response
        
        # Log successful requests from authenticated users
        if (hasattr(request, 'user') and 
            request.user.is_authenticated and 
            200 <= response.status_code < 300):
            
            # Update transaction count for POST requests to transactions
            if (request.path.startswith('/api/transactions/') and 
                request.method == 'POST'):
                try:
                    subscription = request.user.subscription
                    subscription.transactions_this_month += 1
                    subscription.save()
                except Exception:
                    pass
        
        return response