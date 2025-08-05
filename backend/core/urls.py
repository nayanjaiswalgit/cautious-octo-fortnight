from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserViewSet, EntityViewSet, TransactionViewSet,
    UserProfileViewSet, PlanViewSet, ActivityViewSet, DocumentViewSet,
    UserRelationshipViewSet, SocialGroupViewSet, GroupMembershipViewSet,
    NotificationViewSet, RegisterView, LogoutView, current_user, 
    update_user_preferences, change_password, delete_user_account
)
# Note: Subscription, plan customization, and investment views are now integrated into the optimized model architecture
# These features are handled through the Entity model and Transaction model with JSON data storage

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'entities', EntityViewSet, basename='entity')  # Universal entity (accounts, contacts, categories, tags, goals, investments)
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'profiles', UserProfileViewSet, basename='userprofile')
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'relationships', UserRelationshipViewSet, basename='userrelationship')
router.register(r'social-groups', SocialGroupViewSet, basename='socialgroup')
router.register(r'memberships', GroupMembershipViewSet, basename='groupmembership')
router.register(r'notifications', NotificationViewSet, basename='notification')

# Legacy endpoint support - these now use the optimized Entity and Transaction models
# Subscription plans are now managed through the Plan model
# AI settings are stored in UserProfile.config
# Investments are entities with entity_type='investment'
# Recurring transactions use Transaction model with recurrence data in transaction_data JSON field

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/change-password/', change_password, name='change_password'),
    
    # User endpoints
    path('users/me/', current_user, name='current_user'),
    path('users/update_preferences/', update_user_preferences, name='update_preferences'),
    path('auth/user/', delete_user_account, name='delete_user'),
    
    # API endpoints
    path('', include(router.urls)),
]