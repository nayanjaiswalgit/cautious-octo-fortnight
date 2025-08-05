"""
Plan customization and add-on management views
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction, models
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from datetime import timedelta

from .models import (
    PlanAddon, UserPlanCustomization, UserAddonInstance, 
    PlanTemplate, UserPlanHistory, SubscriptionPlan, UserSubscription
)
from .serializers import (
    PlanAddonSerializer, UserPlanCustomizationSerializer, UserAddonInstanceSerializer,
    PlanTemplateSerializer, UserPlanHistorySerializer, PlanCustomizationRequestSerializer
)

User = get_user_model()


class PlanAddonViewSet(viewsets.ReadOnlyModelViewSet):
    """Available plan add-ons"""
    queryset = PlanAddon.objects.filter(is_active=True)
    serializer_class = PlanAddonSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by addon type
        addon_type = self.request.query_params.get('type')
        if addon_type:
            queryset = queryset.filter(addon_type=addon_type)
        
        # Filter by compatibility with user's current plan
        compatible_only = self.request.query_params.get('compatible_only')
        if compatible_only and self.request.user.is_authenticated:
            try:
                user_plan = self.request.user.subscription.plan
                queryset = queryset.filter(
                    models.Q(compatible_plans=user_plan) | 
                    models.Q(compatible_plans__isnull=True)
                )
            except UserSubscription.DoesNotExist:
                pass
        
        return queryset.order_by('addon_type', 'price')
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get add-ons grouped by category"""
        categories = {}
        
        for addon in self.get_queryset():
            category = addon.get_addon_type_display()
            if category not in categories:
                categories[category] = []
            categories[category].append(PlanAddonSerializer(addon).data)
        
        return Response(categories)


class PlanTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Pre-configured plan templates"""
    queryset = PlanTemplate.objects.filter(is_active=True)
    serializer_class = PlanTemplateSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user type
        user_type = self.request.query_params.get('user_type')
        if user_type:
            queryset = queryset.filter(target_user_types__contains=[user_type])
        
        # Show featured first
        return queryset.order_by('-is_featured', '-discount_percentage', 'total_price')


class UserPlanCustomizationViewSet(viewsets.ModelViewSet):
    """User's plan customization management"""
    serializer_class = UserPlanCustomizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserPlanCustomization.objects.filter(
            user_subscription__user=self.request.user
        )
    
    def get_object(self):
        """Get or create customization for user's current subscription"""
        try:
            subscription = self.request.user.subscription
            customization, created = UserPlanCustomization.objects.get_or_create(
                user_subscription=subscription
            )
            if created:
                customization.calculate_totals()
            return customization
        except UserSubscription.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("No active subscription found")
    
    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='10/h', method='POST'))
    def customize_plan(self, request):
        """Customize user's plan with add-ons"""
        serializer = PlanCustomizationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        base_plan_id = serializer.validated_data['base_plan_id']
        addons_data = serializer.validated_data.get('addons', [])
        
        with transaction.atomic():
            # Get or create user subscription
            subscription, created = UserSubscription.objects.get_or_create(
                user=request.user,
                defaults={
                    'plan_id': base_plan_id,
                    'status': 'active'
                }
            )
            
            # Update plan if different
            if subscription.plan_id != base_plan_id:
                old_plan = subscription.plan
                subscription.plan_id = base_plan_id
                subscription.save()
                
                # Log plan change
                UserPlanHistory.objects.create(
                    user=request.user,
                    previous_plan=old_plan,
                    new_plan=subscription.plan,
                    change_reason='upgrade' if subscription.plan.price > old_plan.price else 'downgrade',
                    cost_difference=subscription.plan.price - old_plan.price,
                    effective_date=timezone.now(),
                    changed_by=request.user
                )
            
            # Get or create customization
            customization, _ = UserPlanCustomization.objects.get_or_create(
                user_subscription=subscription
            )
            
            # Remove existing add-ons
            customization.addon_instances.filter(is_active=True).update(is_active=False)
            
            # Add new add-ons
            total_cost_increase = 0
            for addon_data in addons_data:
                addon = PlanAddon.objects.get(id=addon_data['addon_id'])
                quantity = addon_data['quantity']
                
                # Create or update addon instance
                addon_instance, created = UserAddonInstance.objects.get_or_create(
                    customization=customization,
                    addon=addon,
                    defaults={
                        'quantity': quantity,
                        'next_billing_date': timezone.now() + timedelta(days=30),
                        'is_active': True
                    }
                )
                
                if not created:
                    addon_instance.quantity = quantity
                    addon_instance.is_active = True
                    addon_instance.save()
                
                total_cost_increase += addon_instance.monthly_cost
                
                # Log addon addition
                UserPlanHistory.objects.create(
                    user=request.user,
                    previous_plan=subscription.plan,
                    new_plan=subscription.plan,
                    change_reason='addon_purchase',
                    cost_difference=addon_instance.monthly_cost,
                    effective_date=timezone.now(),
                    changed_by=request.user,
                    notes=f"Added {addon.name} x{quantity}"
                )
            
            # Recalculate totals
            customization.calculate_totals()
            
            # Update subscription credits if AI credits were added
            ai_credits_added = sum(
                addon_data['quantity'] * PlanAddon.objects.get(id=addon_data['addon_id']).credits_amount
                for addon_data in addons_data
                if PlanAddon.objects.get(id=addon_data['addon_id']).addon_type == 'credits'
            )
            
            if ai_credits_added > 0:
                subscription.ai_credits_remaining += ai_credits_added
                subscription.save()
        
        serializer = UserPlanCustomizationSerializer(customization)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def apply_template(self, request):
        """Apply a pre-configured plan template"""
        template_id = request.data.get('template_id')
        
        try:
            template = PlanTemplate.objects.get(id=template_id, is_active=True)
        except PlanTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Convert template to customization request
        addons_data = [
            {'addon_id': ta.addon.id, 'quantity': ta.quantity}
            for ta in template.template_addons.all()
        ]
        
        request.data.update({
            'base_plan_id': template.base_plan.id,
            'addons': addons_data
        })
        
        return self.customize_plan(request)
    
    @action(detail=True, methods=['post'])
    def add_addon(self, request, pk=None):
        """Add a single add-on to existing customization"""
        customization = self.get_object()
        addon_id = request.data.get('addon_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            addon = PlanAddon.objects.get(id=addon_id, is_active=True)
        except PlanAddon.DoesNotExist:
            return Response(
                {'error': 'Add-on not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check compatibility
        base_plan = customization.user_subscription.plan
        if addon.compatible_plans.exists() and base_plan not in addon.compatible_plans.all():
            return Response(
                {'error': f'Add-on not compatible with {base_plan.name} plan'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already exists
        existing = customization.addon_instances.filter(addon=addon, is_active=True).first()
        if existing:
            if not addon.is_stackable:
                return Response(
                    {'error': 'This add-on is already active and not stackable'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update quantity
            new_quantity = existing.quantity + quantity
            if new_quantity > addon.max_quantity:
                return Response(
                    {'error': f'Maximum quantity exceeded. Max: {addon.max_quantity}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            existing.quantity = new_quantity
            existing.save()
            addon_instance = existing
        else:
            # Create new instance
            addon_instance = UserAddonInstance.objects.create(
                customization=customization,
                addon=addon,
                quantity=quantity,
                next_billing_date=timezone.now() + timedelta(days=30)
            )
        
        # Log change
        UserPlanHistory.objects.create(
            user=request.user,
            previous_plan=base_plan,
            new_plan=base_plan,
            change_reason='addon_purchase',
            cost_difference=addon_instance.monthly_cost,
            effective_date=timezone.now(),
            changed_by=request.user,
            notes=f"Added {addon.name} x{quantity}"
        )
        
        # Add AI credits if applicable
        if addon.addon_type == 'credits':
            subscription = customization.user_subscription
            subscription.ai_credits_remaining += addon.credits_amount * quantity
            subscription.save()
        
        serializer = UserPlanCustomizationSerializer(customization)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def remove_addon(self, request, pk=None):
        """Remove an add-on from customization"""
        customization = self.get_object()
        addon_instance_id = request.data.get('addon_instance_id')
        
        try:
            addon_instance = customization.addon_instances.get(
                id=addon_instance_id, 
                is_active=True
            )
        except UserAddonInstance.DoesNotExist:
            return Response(
                {'error': 'Add-on instance not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log removal
        UserPlanHistory.objects.create(
            user=request.user,
            previous_plan=customization.user_subscription.plan,
            new_plan=customization.user_subscription.plan,
            change_reason='addon_removal',
            cost_difference=-addon_instance.monthly_cost,
            effective_date=timezone.now(),
            changed_by=request.user,
            notes=f"Removed {addon_instance.addon.name} x{addon_instance.quantity}"
        )
        
        # Deactivate addon
        addon_instance.is_active = False
        addon_instance.save()
        
        serializer = UserPlanCustomizationSerializer(customization)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def preview_customization(self, request):
        """Preview customization without applying changes"""
        serializer = PlanCustomizationRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        base_plan = SubscriptionPlan.objects.get(id=serializer.validated_data['base_plan_id'])
        addons_data = serializer.validated_data.get('addons', [])
        
        # Calculate totals
        total_ai_credits = base_plan.ai_credits_per_month
        total_transactions = base_plan.max_transactions_per_month
        total_accounts = base_plan.max_accounts
        total_monthly_cost = base_plan.price
        features = base_plan.features.copy()
        
        addon_details = []
        for addon_data in addons_data:
            addon = PlanAddon.objects.get(id=addon_data['addon_id'])
            quantity = addon_data['quantity']
            
            total_ai_credits += addon.credits_amount * quantity
            total_transactions += addon.transaction_increase * quantity
            total_accounts += addon.account_increase * quantity
            
            if addon.billing_cycle == 'monthly':
                addon_cost = addon.price * quantity
            elif addon.billing_cycle == 'yearly':
                addon_cost = (addon.price * quantity) / 12
            else:
                addon_cost = 0
            
            total_monthly_cost += addon_cost
            
            # Merge features
            for feature, enabled in addon.feature_flags.items():
                if enabled:
                    features[feature] = True
            
            addon_details.append({
                'addon': PlanAddonSerializer(addon).data,
                'quantity': quantity,
                'monthly_cost': addon_cost
            })
        
        return Response({
            'base_plan': PlanAddonSerializer(base_plan).data,
            'addons': addon_details,
            'totals': {
                'ai_credits': total_ai_credits,
                'transactions_limit': total_transactions,
                'accounts_limit': total_accounts,
                'monthly_cost': total_monthly_cost,
                'features': features
            }
        })


class UserPlanHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """User's plan change history"""
    serializer_class = UserPlanHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserPlanHistory.objects.filter(user=self.request.user)