"""
Optimized Django models for the finance tracker application
This file contains consolidated and optimized models to reduce redundancy and improve maintainability
"""

import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from cryptography.fernet import Fernet
from django.conf import settings


# ================================
# BASE MODELS AND MIXINS
# ================================

class TimestampedModel(models.Model):
    """Abstract base model with timestamp fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UserOwnedModel(TimestampedModel):
    """Abstract base model for user-owned entities"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        abstract = True


class BaseTransaction(UserOwnedModel):
    """Abstract base for all transaction types"""
    # Core fields
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    date = models.DateField()
    currency = models.CharField(max_length=3, default='USD')
    notes = models.TextField(blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Status tracking
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    class Meta:
        abstract = True


# ================================
# CORE MODELS
# ================================

class Account(UserOwnedModel):
    """Financial accounts"""
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('credit', 'Credit Card'),
        ('investment', 'Investment'),
        ('loan', 'Loan'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    is_active = models.BooleanField(default=True)
    account_number = models.CharField(max_length=50, blank=True)
    institution = models.CharField(max_length=255, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['account_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.account_type})"


class Category(UserOwnedModel):
    """Transaction categories with hierarchical support"""
    CATEGORY_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('both', 'Both'),
    ]
    
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=10, choices=CATEGORY_TYPES, default='expense')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    color = models.CharField(max_length=7, default='#0066CC')  # Hex color
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['user', 'category_type']),
            models.Index(fields=['parent']),
        ]
    
    def __str__(self):
        return self.name


class Tag(UserOwnedModel):
    """Transaction tags"""
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6B7280')
    
    class Meta:
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class Contact(UserOwnedModel):
    """Contacts for lending and group expenses"""
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


# ================================
# UNIFIED TRANSACTION MODEL
# ================================

class Transaction(BaseTransaction):
    """Unified transaction model handling all transaction types"""
    
    # Transaction categories for different use cases
    TRANSACTION_CATEGORIES = [
        ('standard', 'Standard Transaction'),
        ('investment', 'Investment Transaction'),
        ('lending', 'Lending Transaction'),
        ('recurring_template', 'Recurring Template'),
        ('group_expense', 'Group Expense'),
    ]
    
    # Standard transaction types
    TRANSACTION_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
        ('buy', 'Buy Investment'),
        ('sell', 'Sell Investment'),
        ('dividend', 'Dividend'),
        ('lend', 'Lend Money'),
        ('borrow', 'Borrow Money'),
        ('repayment', 'Repayment'),
    ]
    
    # Recurrence frequency options
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    # Core categorization
    transaction_category = models.CharField(max_length=20, choices=TRANSACTION_CATEGORIES, default='standard')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='expense')
    
    # Standard transaction fields
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    transfer_account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='transfer_transactions')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    suggested_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='suggested_transactions')
    tags = models.ManyToManyField(Tag, blank=True, related_name='transactions')
    
    # Investment-specific fields
    investment = models.ForeignKey('Investment', on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    quantity = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Lending-specific fields
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    due_date = models.DateField(null=True, blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Recurring transaction template fields
    is_template = models.BooleanField(default=False)
    template_name = models.CharField(max_length=255, blank=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, null=True, blank=True)
    frequency_interval = models.PositiveIntegerField(default=1, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    max_executions = models.PositiveIntegerField(null=True, blank=True)
    next_execution_date = models.DateField(null=True, blank=True)
    is_active_template = models.BooleanField(default=False)
    is_manual = models.BooleanField(default=False)
    auto_categorize = models.BooleanField(default=True)
    execution_conditions = models.JSONField(default=dict, blank=True)
    
    # Group expense fields
    group_expense = models.ForeignKey('GroupExpense', on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    
    # Enhanced fields
    merchant_name = models.CharField(max_length=255, null=True, blank=True)
    original_description = models.TextField(null=True, blank=True)
    verified = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'transaction_category']),
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['account']),
            models.Index(fields=['category']),
            models.Index(fields=['investment']),
            models.Index(fields=['contact']),
            models.Index(fields=['is_template', 'is_active_template']),
            models.Index(fields=['next_execution_date', 'is_active_template']),
        ]
    
    def __str__(self):
        if self.is_template:
            return f"Template: {self.template_name or self.description}"
        return f"{self.description} - {self.amount} ({self.date})"
    
    @property
    def total_executions(self):
        """Get total executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.count()
    
    @property
    def successful_executions(self):
        """Get successful executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.filter(status='completed').count()
    
    @property
    def failed_executions(self):
        """Get failed executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.filter(status='failed').count()
    
    def execute_recurring_transaction(self):
        """Execute a recurring transaction template"""
        if not self.is_template or not self.is_active_template:
            raise ValueError("This is not an active recurring transaction template")
        
        try:
            # Create actual transaction from template
            actual_transaction = Transaction.objects.create(
                user=self.user,
                transaction_category='standard',
                transaction_type=self.transaction_type,
                account=self.account,
                transfer_account=self.transfer_account,
                category=self.category if self.auto_categorize else None,
                amount=self.amount,
                description=self.description,
                date=timezone.now().date(),
                currency=self.currency,
                notes=f"Auto-generated from recurring template: {self.template_name}",
                metadata={'source_template_id': self.id}
            )
            
            # Log execution
            execution_log = ActivityLog.objects.create(
                user=self.user,
                activity_type='transaction_execution',
                object_type='transaction',
                object_id=str(self.id),
                status='completed',
                details={
                    'template_id': self.id,
                    'created_transaction_id': actual_transaction.id,
                    'execution_date': timezone.now().isoformat(),
                    'amount': str(self.amount)
                },
                metadata={'auto_execution': not self.is_manual}
            )
            
            # Update next execution date
            self.update_next_execution_date()
            
            return actual_transaction, execution_log
            
        except Exception as e:
            # Log failed execution
            execution_log = ActivityLog.objects.create(
                user=self.user,
                activity_type='transaction_execution',
                object_type='transaction',
                object_id=str(self.id),
                status='failed',
                details={
                    'template_id': self.id,
                    'error_message': str(e),
                    'execution_date': timezone.now().isoformat()
                }
            )
            
            raise e
    
    def update_next_execution_date(self):
        """Update the next execution date based on frequency"""
        if not self.is_template or not self.frequency:
            return
        
        current_date = self.next_execution_date or self.start_date or timezone.now().date()
        
        if self.frequency == 'daily':
            next_date = current_date + timedelta(days=self.frequency_interval)
        elif self.frequency == 'weekly':
            next_date = current_date + timedelta(weeks=self.frequency_interval)
        elif self.frequency == 'biweekly':
            next_date = current_date + timedelta(weeks=2 * self.frequency_interval)
        elif self.frequency == 'monthly':
            # Add months (approximate)
            next_date = current_date + timedelta(days=30 * self.frequency_interval)
        elif self.frequency == 'quarterly':
            next_date = current_date + timedelta(days=90 * self.frequency_interval)
        elif self.frequency == 'yearly':
            next_date = current_date + timedelta(days=365 * self.frequency_interval)
        else:
            return
        
        # Check if we should stop (end date or max executions)
        if self.end_date and next_date > self.end_date:
            self.is_active_template = False
            self.next_execution_date = None
        elif self.max_executions and self.total_executions >= self.max_executions:
            self.is_active_template = False
            self.next_execution_date = None
        else:
            self.next_execution_date = next_date
        
        self.save()


# ================================
# INVESTMENT MODELS
# ================================

class Investment(UserOwnedModel):
    """Investment tracking with portfolio support"""
    
    INVESTMENT_TYPES = [
        ('stock', 'Stock'),
        ('bond', 'Bond'),
        ('etf', 'ETF'),
        ('mutual_fund', 'Mutual Fund'),
        ('crypto', 'Cryptocurrency'),
        ('commodity', 'Commodity'),
        ('real_estate', 'Real Estate'),
        ('other', 'Other'),
    ]
    
    RISK_LEVELS = [
        ('low', 'Low Risk'),
        ('moderate', 'Moderate Risk'),
        ('high', 'High Risk'),
        ('very_high', 'Very High Risk'),
    ]
    
    # Basic information
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES)
    sector = models.CharField(max_length=100, blank=True)
    
    # Pricing information
    current_price = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    currency = models.CharField(max_length=3, default='USD')
    last_price_update = models.DateTimeField(null=True, blank=True)
    price_source = models.CharField(max_length=50, default='manual')
    auto_update_price = models.BooleanField(default=False)
    
    # Portfolio grouping (simplified - no separate Portfolio model)
    portfolio_name = models.CharField(max_length=255, default='Default')
    portfolio_weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Investment details
    description = models.TextField(blank=True)
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS, null=True, blank=True)
    dividend_yield = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Market data (optional)
    market_cap = models.BigIntegerField(null=True, blank=True)
    pe_ratio = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    beta = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    fifty_two_week_high = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    fifty_two_week_low = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['user', 'symbol', 'investment_type']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['symbol', 'investment_type']),
            models.Index(fields=['portfolio_name']),
            models.Index(fields=['sector']),
        ]
    
    def __str__(self):
        return f"{self.symbol} - {self.name}"
    
    @property
    def current_quantity(self):
        """Calculate current quantity from transactions"""
        buy_quantity = self.transactions.filter(
            transaction_type__in=['buy'], 
            status='active'
        ).aggregate(total=models.Sum('quantity'))['total'] or Decimal('0')
        
        sell_quantity = self.transactions.filter(
            transaction_type__in=['sell'], 
            status='active'
        ).aggregate(total=models.Sum('quantity'))['total'] or Decimal('0')
        
        return buy_quantity - sell_quantity
    
    @property
    def current_value(self):
        """Calculate current market value"""
        return self.current_quantity * self.current_price
    
    @property
    def total_invested(self):
        """Calculate total amount invested (cost basis)"""
        buy_total = self.transactions.filter(
            transaction_type='buy', 
            status='active'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        
        sell_total = self.transactions.filter(
            transaction_type='sell', 
            status='active'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        
        return buy_total - sell_total
    
    @property
    def total_gain_loss(self):
        """Calculate total gain/loss"""
        return self.current_value - self.total_invested
    
    @property
    def total_gain_loss_percentage(self):
        """Calculate gain/loss percentage"""
        if self.total_invested <= 0:
            return Decimal('0')
        return (self.total_gain_loss / self.total_invested) * 100
    
    @classmethod
    def get_portfolio_summary(cls, user, portfolio_name='Default'):
        """Get portfolio metrics without separate model"""
        investments = cls.objects.filter(
            user=user, 
            portfolio_name=portfolio_name, 
            is_active=True
        )
        
        total_value = sum(inv.current_value for inv in investments)
        total_invested = sum(inv.total_invested for inv in investments)
        total_gain_loss = total_value - total_invested
        
        return {
            'name': portfolio_name,
            'investments_count': investments.count(),
            'total_value': total_value,
            'total_invested': total_invested,
            'total_gain_loss': total_gain_loss,
            'total_gain_loss_percentage': (total_gain_loss / total_invested * 100) if total_invested > 0 else 0,
            'top_performers': investments.order_by('-total_gain_loss_percentage')[:3],
            'worst_performers': investments.order_by('total_gain_loss_percentage')[:3],
        }


# ================================
# USER PROFILE AND SETTINGS
# ================================

class UserProfile(models.Model):
    """Consolidated user profile with subscription and settings"""
    
    SUBSCRIPTION_STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
    ]
    
    AI_PROVIDERS = [
        ('system', 'System Default'),
        ('openai', 'OpenAI'),
        ('ollama', 'Ollama'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Subscription information
    current_plan = models.ForeignKey('Plan', on_delete=models.CASCADE, null=True, blank=True)
    subscription_status = models.CharField(max_length=20, choices=SUBSCRIPTION_STATUS_CHOICES, default='trial')
    subscription_start_date = models.DateTimeField(auto_now_add=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    is_auto_renew = models.BooleanField(default=True)
    
    # Usage tracking
    ai_credits_remaining = models.IntegerField(default=100)  # Trial credits
    ai_credits_used_this_month = models.IntegerField(default=0)
    transactions_this_month = models.IntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)
    
    # AI Settings
    preferred_ai_provider = models.CharField(max_length=20, choices=AI_PROVIDERS, default='system')
    openai_api_key = models.TextField(blank=True)  # Encrypted
    openai_model = models.CharField(max_length=50, default='gpt-3.5-turbo')
    ollama_endpoint = models.URLField(default='http://localhost:11434')
    ollama_model = models.CharField(max_length=50, default='llama2')
    
    # AI feature toggles
    enable_ai_suggestions = models.BooleanField(default=True)
    enable_ai_categorization = models.BooleanField(default=True)
    enable_ai_invoice_generation = models.BooleanField(default=True)
    
    # Plan customization (calculated from base plan + addons)
    total_ai_credits = models.IntegerField(default=100)
    total_transactions_limit = models.IntegerField(default=1000)
    total_accounts_limit = models.IntegerField(default=3)
    total_storage_gb = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    custom_features = models.JSONField(default=dict)
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Preferences
    default_currency = models.CharField(max_length=3, default='USD')
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['subscription_status']),
            models.Index(fields=['subscription_end_date']),
        ]
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def encrypt_api_key(self, api_key):
        """Encrypt API key for storage"""
        try:
            fernet = Fernet(settings.SECRET_KEY[:44].encode() + b'==')
            return fernet.encrypt(api_key.encode()).decode()
        except Exception:
            return api_key  # Fallback to plain text
    
    def decrypt_api_key(self):
        """Decrypt stored API key"""
        if not self.openai_api_key:
            return None
        try:
            fernet = Fernet(settings.SECRET_KEY[:44].encode() + b'==')
            return fernet.decrypt(self.openai_api_key.encode()).decode()
        except Exception:
            return self.openai_api_key  # Fallback to plain text
    
    def reset_monthly_usage(self):
        """Reset monthly usage counters"""
        self.ai_credits_used_this_month = 0
        self.transactions_this_month = 0
        self.last_reset_date = timezone.now().date()
        
        # Restore credits from plan
        if self.current_plan:
            self.ai_credits_remaining = self.total_ai_credits
        
        self.save()
    
    def consume_ai_credits(self, credits):
        """Consume AI credits and return success"""
        if self.ai_credits_remaining >= credits:
            self.ai_credits_remaining -= credits
            self.ai_credits_used_this_month += credits
            self.save()
            return True
        return False


# ================================
# SIMPLIFIED PLAN SYSTEM
# ================================

class Plan(TimestampedModel):
    """Unified plan model supporting base plans and addons"""
    
    PLAN_TYPES = [
        ('base', 'Base Plan'),
        ('addon', 'Add-on'),
        ('template', 'Template Bundle'),
    ]
    
    BILLING_CYCLES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        ('one_time', 'One Time'),
    ]
    
    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLES, default='monthly')
    
    # Plan limits and features
    ai_credits_per_month = models.IntegerField(default=0)
    max_transactions_per_month = models.IntegerField(default=0)
    max_accounts = models.IntegerField(default=0)
    storage_gb = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    features = models.JSONField(default=dict)
    
    # Template/Bundle support
    base_plan = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='bundle_plans')
    included_addons = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='parent_templates')
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Addon-specific fields  
    is_stackable = models.BooleanField(default=True)
    max_quantity = models.PositiveIntegerField(default=1)
    compatible_with = models.ManyToManyField('self', blank=True, symmetrical=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['plan_type', 'is_active']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.plan_type})"


class UserPlanAssignment(TimestampedModel):
    """User's current plan assignment with customizations"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='plan_assignment')
    base_plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='user_assignments')
    active_addons = models.ManyToManyField(Plan, blank=True, through='UserAddon')
    
    # Calculated totals (denormalized for performance)
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    effective_limits = models.JSONField(default=dict)  # Combined limits from base + addons
    
    def calculate_totals(self):
        """Recalculate total cost and limits"""
        total_cost = self.base_plan.price
        combined_limits = {
            'ai_credits': self.base_plan.ai_credits_per_month,
            'transactions': self.base_plan.max_transactions_per_month,
            'accounts': self.base_plan.max_accounts,
            'storage_gb': float(self.base_plan.storage_gb),
            'features': self.base_plan.features.copy()
        }
        
        # Add addon contributions
        for user_addon in self.user_addons.filter(is_active=True):
            addon = user_addon.addon
            quantity = user_addon.quantity
            
            # Add to cost
            if addon.billing_cycle == 'monthly':
                total_cost += addon.price * quantity
            elif addon.billing_cycle == 'yearly':
                total_cost += (addon.price * quantity) / 12
            
            # Add to limits
            combined_limits['ai_credits'] += addon.ai_credits_per_month * quantity
            combined_limits['transactions'] += addon.max_transactions_per_month * quantity
            combined_limits['accounts'] += addon.max_accounts * quantity
            combined_limits['storage_gb'] += float(addon.storage_gb) * quantity
            
            # Merge features
            for feature, value in addon.features.items():
                combined_limits['features'][feature] = value
        
        self.total_monthly_cost = total_cost
        self.effective_limits = combined_limits
        self.save()
        
        # Update user profile
        if hasattr(self.user, 'profile'):
            profile = self.user.profile
            profile.total_ai_credits = combined_limits['ai_credits']
            profile.total_transactions_limit = combined_limits['transactions']
            profile.total_accounts_limit = combined_limits['accounts']
            profile.total_storage_gb = combined_limits['storage_gb']
            profile.custom_features = combined_limits['features']
            profile.total_monthly_cost = total_cost
            profile.save()


class UserAddon(TimestampedModel):
    """Through model for user's active addons"""
    user_plan = models.ForeignKey(UserPlanAssignment, on_delete=models.CASCADE, related_name='user_addons')
    addon = models.ForeignKey(Plan, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['user_plan', 'addon']


# ================================
# SUPPORTING MODELS
# ================================

class Goal(UserOwnedModel):
    """Financial goals"""
    GOAL_TYPES = [
        ('savings', 'Savings Goal'),
        ('debt_reduction', 'Debt Reduction'),
        ('investment', 'Investment Goal'),
        ('expense_reduction', 'Expense Reduction'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['goal_type']),
        ]
    
    @property
    def progress_percentage(self):
        if self.target_amount <= 0:
            return 0
        return min(100, (self.current_amount / self.target_amount) * 100)
    
    def __str__(self):
        return self.name


class GroupExpense(UserOwnedModel):
    """Group expenses for splitting bills"""
    SPLIT_METHODS = [
        ('equal', 'Split Equally'),
        ('percentage', 'Split by Percentage'),
        ('amount', 'Split by Amount'),
        ('shares', 'Split by Shares'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('settled', 'Settled'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    split_method = models.CharField(max_length=20, choices=SPLIT_METHODS, default='equal')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return self.title


class GroupExpenseShare(TimestampedModel):
    """Individual shares in group expenses"""
    group_expense = models.ForeignKey(GroupExpense, on_delete=models.CASCADE, related_name='shares')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    @property
    def is_settled(self):
        return self.paid_amount >= self.share_amount
    
    @property
    def remaining_amount(self):
        return max(0, self.share_amount - self.paid_amount)


# ================================
# ACTIVITY AND AUDIT LOGGING
# ================================

class ActivityLog(TimestampedModel):
    """Unified activity and audit logging"""
    
    ACTIVITY_TYPES = [
        ('transaction_execution', 'Transaction Execution'),
        ('plan_change', 'Plan Change'),
        ('ai_usage', 'AI Usage'),
        ('investment_update', 'Investment Update'),
        ('login', 'User Login'),
        ('password_change', 'Password Change'),
        ('data_export', 'Data Export'),
        ('api_access', 'API Access'),
    ]
    
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    
    # Generic reference to related objects
    object_type = models.CharField(max_length=50, blank=True)  # 'transaction', 'plan', etc.
    object_id = models.CharField(max_length=50, blank=True)
    
    # Activity details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    details = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)
    
    # Request context (for API access)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['object_type', 'object_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type} ({self.status})"


# ================================
# UTILITY MODELS
# ================================

class Invoice(UserOwnedModel):
    """Invoice management"""
    INVOICE_TYPES = [
        ('standard', 'Standard Invoice'),
        ('recurring', 'Recurring Invoice'),
        ('quote', 'Quote'),
        ('receipt', 'Receipt'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPES, default='standard')
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Client information
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_address = models.TextField(blank=True)
    
    # Invoice details
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Dates
    issue_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    
    # AI generation tracking
    generated_by_ai = models.BooleanField(default=False)
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # File storage
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['issue_date']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client_name}"