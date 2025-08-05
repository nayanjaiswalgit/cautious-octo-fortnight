"""
Optimized serializers for the consolidated model architecture
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal

# Import optimized models
from .models_optimized import (
    Account, Category, Tag, Transaction, Investment, UserProfile,
    Plan, UserPlanAssignment, UserAddon, Goal, GroupExpense, 
    GroupExpenseShare, Contact, ActivityLog, Invoice
)

User = get_user_model()


# ================================
# USER AND PROFILE SERIALIZERS
# ================================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    """Consolidated user profile with subscription and settings"""
    user = UserSerializer(read_only=True)
    current_plan_name = serializers.CharField(source='current_plan.name', read_only=True)
    subscription_days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'current_plan', 'current_plan_name', 'subscription_status',
            'subscription_start_date', 'subscription_end_date', 'is_auto_renew',
            'ai_credits_remaining', 'ai_credits_used_this_month', 'transactions_this_month',
            'last_reset_date', 'preferred_ai_provider', 'openai_model', 'ollama_endpoint',
            'ollama_model', 'enable_ai_suggestions', 'enable_ai_categorization',
            'enable_ai_invoice_generation', 'total_ai_credits', 'total_transactions_limit',
            'total_accounts_limit', 'total_storage_gb', 'custom_features',
            'total_monthly_cost', 'default_currency', 'timezone', 'language',
            'subscription_days_remaining', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'last_reset_date']
        extra_kwargs = {
            'openai_api_key': {'write_only': True}
        }
    
    def get_subscription_days_remaining(self, obj):
        """Calculate days remaining in subscription"""
        if not obj.subscription_end_date:
            return None
        
        from django.utils import timezone
        remaining = obj.subscription_end_date.date() - timezone.now().date()
        return max(0, remaining.days)
    
    def to_representation(self, instance):
        """Don't return the encrypted API key"""
        data = super().to_representation(instance)
        data['has_openai_key'] = bool(instance.openai_api_key)
        return data


# ================================
# CORE MODEL SERIALIZERS
# ================================

class AccountSerializer(serializers.ModelSerializer):
    balance_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'balance', 'balance_formatted', 'currency',
            'is_active', 'account_number', 'institution', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_balance_formatted(self, obj):
        return f"{obj.currency} {obj.balance:,.2f}"
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'category_type', 'parent', 'parent_name', 'color', 'icon',
            'is_active', 'subcategories', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.filter(is_active=True), many=True).data
        return []
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'name', 'email', 'phone', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ================================
# UNIFIED TRANSACTION SERIALIZER
# ================================

class TransactionSerializer(serializers.ModelSerializer):
    """Unified transaction serializer handling all transaction types"""
    
    # Related object names for display
    account_name = serializers.CharField(source='account.name', read_only=True)
    transfer_account_name = serializers.CharField(source='transfer_account.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    investment_symbol = serializers.CharField(source='investment.symbol', read_only=True)
    tags_data = TagSerializer(source='tags', many=True, read_only=True)
    
    # Calculated fields for recurring templates
    total_executions = serializers.ReadOnlyField()
    successful_executions = serializers.ReadOnlyField()
    failed_executions = serializers.ReadOnlyField()
    
    # Display fields
    amount_formatted = serializers.SerializerMethodField()
    transaction_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            # Core fields
            'id', 'transaction_category', 'transaction_type', 'amount', 'amount_formatted',
            'description', 'date', 'currency', 'notes', 'external_id', 'status',
            
            # Standard transaction fields
            'account', 'account_name', 'transfer_account', 'transfer_account_name',
            'category', 'category_name', 'suggested_category', 'tags_data',
            'merchant_name', 'original_description', 'verified',
            
            # Investment fields
            'investment', 'investment_symbol', 'quantity', 'price_per_unit', 'fees',
            
            # Lending fields
            'contact', 'contact_name', 'due_date', 'interest_rate',
            
            # Recurring template fields
            'is_template', 'template_name', 'frequency', 'frequency_interval',
            'start_date', 'end_date', 'max_executions', 'next_execution_date',
            'is_active_template', 'is_manual', 'auto_categorize', 'execution_conditions',
            'total_executions', 'successful_executions', 'failed_executions',
            
            # Group expense fields
            'group_expense',
            
            # Metadata and display
            'metadata', 'transaction_display', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'account_name', 'transfer_account_name',
            'category_name', 'contact_name', 'investment_symbol'
        ]
    
    def get_amount_formatted(self, obj):
        return f"{obj.currency} {obj.amount:,.2f}"
    
    def get_transaction_display(self, obj):
        """Generate human-readable transaction display"""
        if obj.is_template:
            return f"Template: {obj.template_name or obj.description} ({obj.frequency})"
        
        if obj.transaction_category == 'investment':
            action = obj.transaction_type.title()
            if obj.investment:
                return f"{action} {obj.quantity} shares of {obj.investment.symbol}"
        
        if obj.transaction_category == 'lending':
            action = "Lent to" if obj.transaction_type == 'lend' else "Borrowed from"
            if obj.contact:
                return f"{action} {obj.contact.name}: {obj.description}"
        
        return obj.description
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate(self, data):
        """Validate transaction data based on category"""
        category = data.get('transaction_category', 'standard')
        
        if category == 'standard':
            if not data.get('account'):
                raise serializers.ValidationError("Account is required for standard transactions")
        
        elif category == 'investment':
            if not data.get('investment'):
                raise serializers.ValidationError("Investment is required for investment transactions")
            if not data.get('quantity') or not data.get('price_per_unit'):
                raise serializers.ValidationError("Quantity and price per unit are required for investment transactions")
        
        elif category == 'lending':
            if not data.get('contact'):
                raise serializers.ValidationError("Contact is required for lending transactions")
        
        elif category == 'recurring_template':
            if not data.get('frequency'):
                raise serializers.ValidationError("Frequency is required for recurring templates")
            if not data.get('start_date'):
                raise serializers.ValidationError("Start date is required for recurring templates")
        
        return data


# ================================
# INVESTMENT SERIALIZERS
# ================================

class InvestmentSerializer(serializers.ModelSerializer):
    # Calculated properties
    current_quantity = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    total_invested = serializers.ReadOnlyField()
    total_gain_loss = serializers.ReadOnlyField()
    total_gain_loss_percentage = serializers.ReadOnlyField()
    
    # Display fields
    current_value_formatted = serializers.SerializerMethodField()
    gain_loss_formatted = serializers.SerializerMethodField()
    
    # Recent transactions
    recent_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Investment
        fields = [
            'id', 'symbol', 'name', 'investment_type', 'sector', 'current_price',
            'currency', 'last_price_update', 'price_source', 'auto_update_price',
            'portfolio_name', 'portfolio_weight', 'description', 'risk_level',
            'dividend_yield', 'market_cap', 'pe_ratio', 'beta',
            'fifty_two_week_high', 'fifty_two_week_low', 'is_active',
            'current_quantity', 'current_value', 'current_value_formatted',
            'total_invested', 'total_gain_loss', 'total_gain_loss_percentage',
            'gain_loss_formatted', 'recent_transactions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_price_update']
    
    def get_current_value_formatted(self, obj):
        return f"{obj.currency} {obj.current_value:,.2f}"
    
    def get_gain_loss_formatted(self, obj):
        gain_loss = obj.total_gain_loss
        percentage = obj.total_gain_loss_percentage
        sign = "+" if gain_loss >= 0 else ""
        return f"{sign}{obj.currency} {gain_loss:,.2f} ({sign}{percentage:.2f}%)"
    
    def get_recent_transactions(self, obj):
        """Get recent investment transactions"""
        recent_tx = obj.transactions.filter(
            transaction_category='investment'
        ).order_by('-date')[:5]
        
        return [{
            'id': tx.id,
            'type': tx.transaction_type,
            'quantity': tx.quantity,
            'price': tx.price_per_unit,
            'total': tx.amount,
            'date': tx.date,
        } for tx in recent_tx]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ================================
# PLAN SERIALIZERS
# ================================

class PlanSerializer(serializers.ModelSerializer):
    """Unified plan serializer for base plans, addons, and templates"""
    
    # For templates
    base_plan_name = serializers.CharField(source='base_plan.name', read_only=True)
    included_addons_count = serializers.SerializerMethodField()
    savings_amount = serializers.SerializerMethodField()
    
    # For addons
    compatible_plans = serializers.SerializerMethodField()
    
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'plan_type', 'description', 'price', 'billing_cycle',
            'ai_credits_per_month', 'max_transactions_per_month', 'max_accounts',
            'storage_gb', 'features', 'base_plan', 'base_plan_name',
            'included_addons_count', 'discount_percentage', 'savings_amount',
            'is_stackable', 'max_quantity', 'compatible_plans', 'is_active',
            'is_featured', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_included_addons_count(self, obj):
        if obj.plan_type == 'template':
            return obj.included_addons.count()
        return 0
    
    def get_savings_amount(self, obj):
        """Calculate savings for templates"""
        if obj.plan_type != 'template' or not obj.base_plan:
            return Decimal('0')
        
        individual_total = obj.base_plan.price
        for addon in obj.included_addons.all():
            individual_total += addon.price
        
        savings = individual_total - obj.price
        return max(Decimal('0'), savings)
    
    def get_compatible_plans(self, obj):
        """Get compatible plans for addons"""
        if obj.plan_type == 'addon':
            return [{'id': p.id, 'name': p.name} for p in obj.compatible_with.all()]
        return []


class UserAddonSerializer(serializers.ModelSerializer):
    addon = PlanSerializer(read_only=True)
    addon_id = serializers.IntegerField(write_only=True)
    monthly_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = UserAddon
        fields = [
            'id', 'addon', 'addon_id', 'quantity', 'is_active',
            'monthly_cost', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_monthly_cost(self, obj):
        """Calculate monthly cost for this addon instance"""
        if obj.addon.billing_cycle == 'monthly':
            return obj.addon.price * obj.quantity
        elif obj.addon.billing_cycle == 'yearly':
            return (obj.addon.price * obj.quantity) / 12
        return obj.addon.price * obj.quantity


class UserPlanAssignmentSerializer(serializers.ModelSerializer):
    """User's plan assignment with addons"""
    base_plan = PlanSerializer(read_only=True)
    user_addons = UserAddonSerializer(many=True, read_only=True)
    effective_limits_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPlanAssignment
        fields = [
            'id', 'base_plan', 'user_addons', 'total_monthly_cost',
            'effective_limits', 'effective_limits_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_effective_limits_display(self, obj):
        """Format effective limits for display"""
        limits = obj.effective_limits
        return {
            'ai_credits': f"{limits.get('ai_credits', 0):,} credits/month",
            'transactions': f"{limits.get('transactions', 0):,} transactions/month",
            'accounts': f"{limits.get('accounts', 0)} accounts",
            'storage': f"{limits.get('storage_gb', 0)} GB storage",
            'features': list(limits.get('features', {}).keys())
        }


# ================================
# SUPPORTING MODEL SERIALIZERS
# ================================

class GoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.ReadOnlyField()
    progress_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Goal
        fields = [
            'id', 'name', 'description', 'goal_type', 'target_amount',
            'current_amount', 'target_date', 'status', 'progress_percentage',
            'progress_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_progress_display(self, obj):
        return f"{obj.current_amount:,.2f} / {obj.target_amount:,.2f} ({obj.progress_percentage:.1f}%)"
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class GroupExpenseShareSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    is_settled = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = GroupExpenseShare
        fields = [
            'id', 'contact', 'contact_name', 'share_amount', 'paid_amount',
            'payment_date', 'notes', 'is_settled', 'remaining_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'contact_name']


class GroupExpenseSerializer(serializers.ModelSerializer):
    shares = GroupExpenseShareSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupExpense
        fields = [
            'id', 'title', 'description', 'total_amount', 'currency',
            'split_method', 'date', 'status', 'shares', 'total_paid',
            'remaining_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_paid(self, obj):
        return sum(share.paid_amount for share in obj.shares.all())
    
    def get_remaining_amount(self, obj):
        return obj.total_amount - self.get_total_paid(obj)
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    details_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'activity_type', 'object_type', 'object_id',
            'status', 'details', 'details_display', 'metadata', 'ip_address',
            'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_details_display(self, obj):
        """Format details for human reading"""
        activity_type = obj.activity_type
        details = obj.details
        
        if activity_type == 'transaction_execution':
            if obj.status == 'completed':
                return f"Successfully executed recurring transaction for {details.get('amount', 'unknown amount')}"
            else:
                return f"Failed to execute recurring transaction: {details.get('error_message', 'Unknown error')}"
        
        elif activity_type == 'ai_usage':
            return f"Used {details.get('provider', 'AI')} for {details.get('usage_type', 'unknown task')}"
        
        elif activity_type == 'plan_change':
            return f"Changed plan: {details.get('change_reason', 'No reason provided')}"
        
        return f"{activity_type.replace('_', ' ').title()}"


class InvoiceSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_type', 'invoice_number', 'status', 'status_display',
            'client_name', 'client_email', 'client_address', 'description',
            'amount', 'tax_amount', 'total_amount', 'currency', 'issue_date',
            'due_date', 'paid_date', 'days_until_due', 'generated_by_ai',
            'ai_confidence_score', 'pdf_file', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'generated_by_ai']
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_days_until_due(self, obj):
        if obj.status in ['paid', 'cancelled'] or not obj.due_date:
            return None
        
        from django.utils import timezone
        remaining = obj.due_date - timezone.now().date()
        return remaining.days
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        
        # Auto-generate invoice number if not provided
        if not validated_data.get('invoice_number'):
            from django.utils import timezone
            user_id = self.context['request'].user.id
            date_str = timezone.now().strftime('%Y%m%d')
            counter = Invoice.objects.filter(user=validated_data['user']).count() + 1
            validated_data['invoice_number'] = f"INV-{date_str}-{user_id}-{counter:03d}"
        
        return super().create(validated_data)


# ================================
# SUMMARY AND DASHBOARD SERIALIZERS
# ================================

class DashboardSummarySerializer(serializers.Serializer):
    """Combined dashboard summary"""
    
    # Account summary
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    account_count = serializers.IntegerField()
    accounts_by_type = serializers.DictField()
    
    # Transaction summary
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    transaction_count = serializers.IntegerField()
    
    # Investment summary
    total_investment_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_investment_gain_loss = serializers.DecimalField(max_digits=12, decimal_places=2)
    investment_count = serializers.IntegerField()
    
    # Recurring transactions
    active_recurring_count = serializers.IntegerField()
    next_executions = serializers.ListField()
    
    # Goals progress
    active_goals_count = serializers.IntegerField()
    goals_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Recent activity
    recent_transactions = TransactionSerializer(many=True)
    recent_activities = ActivityLogSerializer(many=True)


class PortfolioSummarySerializer(serializers.Serializer):
    """Portfolio performance summary"""
    name = serializers.CharField()
    investments_count = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_invested = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_gain_loss = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_gain_loss_percentage = serializers.DecimalField(max_digits=8, decimal_places=2)
    top_performers = InvestmentSerializer(many=True)
    worst_performers = InvestmentSerializer(many=True)
    sector_allocation = serializers.DictField()