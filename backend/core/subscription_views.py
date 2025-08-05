"""
Subscription and AI management views
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction, models
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .models import (
    SubscriptionPlan, UserSubscription, UserAISettings, 
    AIUsageLog, Invoice
)
from .serializers import (
    SubscriptionPlanSerializer, UserSubscriptionSerializer,
    UserAISettingsSerializer, AIUsageLogSerializer, InvoiceSerializer
)
from .ai_service import ai_service

User = get_user_model()


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """Public subscription plans"""
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]


class UserSubscriptionViewSet(viewsets.ModelViewSet):
    """User subscription management"""
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user subscription"""
        try:
            subscription = request.user.subscription
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        except UserSubscription.DoesNotExist:
            # Create free trial subscription
            free_plan = SubscriptionPlan.objects.get(plan_type='free')
            subscription = UserSubscription.objects.create(
                user=request.user,
                plan=free_plan,
                ai_credits_remaining=free_plan.ai_credits_per_month
            )
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def upgrade(self, request):
        """Upgrade user subscription"""
        plan_type = request.data.get('plan_type')
        
        try:
            new_plan = SubscriptionPlan.objects.get(plan_type=plan_type, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'Invalid subscription plan'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            subscription, created = UserSubscription.objects.get_or_create(
                user=request.user,
                defaults={
                    'plan': new_plan,
                    'ai_credits_remaining': new_plan.ai_credits_per_month
                }
            )
            
            if not created:
                subscription.plan = new_plan
                subscription.status = 'active'
                subscription.ai_credits_remaining += new_plan.ai_credits_per_month
                subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def usage_stats(self, request):
        """Get user's usage statistics"""
        try:
            subscription = request.user.subscription
            
            # Get AI usage for current month
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            ai_usage = AIUsageLog.objects.filter(
                user=request.user,
                created_at__gte=current_month
            ).values('usage_type').annotate(
                count=models.Count('id'),
                credits_used=models.Sum('credits_consumed')
            )
            
            return Response({
                'subscription': UserSubscriptionSerializer(subscription).data,
                'ai_usage': list(ai_usage),
                'credits_remaining': subscription.ai_credits_remaining,
                'credits_used_this_month': subscription.ai_credits_used_this_month,
                'transactions_this_month': subscription.transactions_this_month,
            })
        except UserSubscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class UserAISettingsViewSet(viewsets.ModelViewSet):
    """User AI configuration"""
    serializer_class = UserAISettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserAISettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create AI settings for user"""
        settings, created = UserAISettings.objects.get_or_create(
            user=self.request.user
        )
        return settings
    
    def perform_update(self, serializer):
        """Encrypt API key before saving"""
        openai_key = serializer.validated_data.get('openai_api_key', '')
        if openai_key:
            serializer.validated_data['openai_api_key'] = ai_service.encrypt_api_key(openai_key)
        serializer.save()
    
    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='5/m', method='POST'))
    def test_connection(self, request):
        """Test AI provider connection"""
        provider = request.data.get('provider', 'system')
        
        if provider == 'openai':
            api_key = request.data.get('api_key', '')
            if not api_key:
                return Response(
                    {'error': 'API key required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                import openai
                client = openai.OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model='gpt-3.5-turbo',
                    messages=[{'role': 'user', 'content': 'Hello'}],
                    max_tokens=5
                )
                return Response({'success': True, 'message': 'Connection successful'})
            except Exception as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        elif provider == 'ollama':
            endpoint = request.data.get('endpoint', 'http://localhost:11434')
            model = request.data.get('model', 'llama2')
            
            try:
                import ollama
                client = ollama.Client(host=endpoint)
                response = client.generate(model=model, prompt='Hello', options={'num_predict': 5})
                return Response({'success': True, 'message': 'Connection successful'})
            except Exception as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(
            {'error': 'Invalid provider'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class AIUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """User's AI usage history"""
    serializer_class = AIUsageLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AIUsageLog.objects.filter(user=self.request.user).order_by('-created_at')


class InvoiceViewSet(viewsets.ModelViewSet):
    """AI-generated invoices management"""
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='10/h', method='POST'))
    def generate_with_ai(self, request):
        """Generate invoice using AI"""
        invoice_data = {
            'client_name': request.data.get('client_name', ''),
            'client_email': request.data.get('client_email', ''),
            'description': request.data.get('description', ''),
            'amount': request.data.get('amount', 0),
            'due_date': request.data.get('due_date', ''),
            'invoice_type': request.data.get('invoice_type', 'invoice')
        }
        
        # Validate required fields
        if not all([invoice_data['client_name'], invoice_data['description'], invoice_data['amount']]):
            return Response(
                {'error': 'Missing required fields: client_name, description, amount'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use AI service to generate invoice
        result = ai_service.generate_invoice(request.user, invoice_data)
        
        if result['success']:
            # Create invoice record
            invoice = Invoice.objects.create(
                user=request.user,
                invoice_type=invoice_data['invoice_type'],
                invoice_number=f"INV-{timezone.now().strftime('%Y%m%d')}-{request.user.id}",
                client_name=invoice_data['client_name'],
                client_email=invoice_data['client_email'],
                description=invoice_data['description'],
                amount=invoice_data['amount'],
                total_amount=invoice_data['amount'],
                issue_date=timezone.now().date(),
                due_date=invoice_data.get('due_date', timezone.now().date()),
                generated_by_ai=True,
                ai_prompt_used=str(invoice_data)
            )
            
            response_data = InvoiceSerializer(invoice).data
            response_data['ai_generated_content'] = result['content']
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.paid_date = timezone.now().date()
        invoice.save()
        
        return Response(InvoiceSerializer(invoice).data)


class AIServiceViewSet(viewsets.ViewSet):
    """AI service endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='30/m', method='POST'))
    def categorize_transaction(self, request):
        """Categorize a transaction using AI"""
        description = request.data.get('description', '')
        amount = float(request.data.get('amount', 0))
        merchant = request.data.get('merchant', '')
        
        if not description:
            return Response(
                {'error': 'Description is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = ai_service.categorize_transaction(
            request.user, description, amount, merchant
        )
        
        if result['success']:
            return Response({
                'category': result['category'],
                'confidence': result['confidence'],
                'credits_consumed': ai_service.credit_costs['categorization']
            })
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )