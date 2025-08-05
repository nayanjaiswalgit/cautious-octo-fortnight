from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class User(AbstractUser):
    """Enhanced user model with additional fields"""
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
        ]


class Account(models.Model):
    """Bank accounts and financial accounts"""
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('credit', 'Credit Card'),
        ('investment', 'Investment'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='checking')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_user_account_name')
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()})"


class Category(models.Model):
    """Transaction categories"""
    CATEGORY_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
    ]
    
    id = models.CharField(primary_key=True, max_length=50)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=255)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES, default='expense')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    color = models.CharField(max_length=7, default='#6B7280')  # Hex color
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'category_type']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_user_category_name')
        ]
    
    def __str__(self):
        return self.name


class Tag(models.Model):
    """Tags for transactions"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6B7280')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'name']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_user_tag_name')
        ]
    
    def __str__(self):
        return self.name


class UploadSession(models.Model):
    """File upload sessions for statements"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='upload_sessions')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='upload_sessions')
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    transaction_count = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'uploaded_at']),
            models.Index(fields=['account']),
        ]
    
    def __str__(self):
        return f"{self.filename} - {self.transaction_count} transactions"


class Transaction(models.Model):
    """Financial transactions"""
    TRANSACTION_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    transfer_account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='transfer_transactions')
    upload_session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    
    # Core transaction fields
    external_id = models.CharField(max_length=255, null=True, blank=True)  # From bank statements
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='expense')
    
    # Enhanced fields
    merchant_name = models.CharField(max_length=255, null=True, blank=True)
    original_description = models.TextField(null=True, blank=True)
    
    # Categorization
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    suggested_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='suggested_transactions')
    tags = models.ManyToManyField(Tag, blank=True, related_name='transactions')
    
    # Status and notes
    verified = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['account']),
            models.Index(fields=['category']),
            models.Index(fields=['amount']),
            models.Index(fields=['verified']),
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['upload_session']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'external_id', 'upload_session'], 
                name='unique_user_external_id_session',
                condition=models.Q(external_id__isnull=False)
            )
        ]
    
    def __str__(self):
        return f"{self.description} - ${self.amount} ({self.date})"


class Goal(models.Model):
    """Financial goals"""
    GOAL_TYPES = [
        ('savings', 'Savings Goal'),
        ('debt', 'Debt Payoff'),
        ('expense', 'Expense Reduction'),
        ('income', 'Income Target'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES, default='savings')
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['target_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.current_amount}/${self.target_amount}"
    
    @property
    def progress_percentage(self):
        if self.target_amount > 0:
            return min((self.current_amount / self.target_amount) * 100, 100)
        return 0


# Group Expense Models
class Contact(models.Model):
    """People you share expenses or lend money with"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'name']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_user_contact_name')
        ]
    
    def __str__(self):
        return self.name


class GroupExpense(models.Model):
    """Shared expenses between multiple people"""
    SPLIT_METHODS = [
        ('equal', 'Split Equally'),
        ('exact', 'Exact Amounts'),
        ('percentage', 'Percentage'),
        ('shares', 'By Shares'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('settled', 'Settled'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_expenses')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    split_method = models.CharField(max_length=20, choices=SPLIT_METHODS, default='equal')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.title} - ${self.total_amount}"


class GroupExpenseShare(models.Model):
    """Individual participant shares in group expenses"""
    id = models.AutoField(primary_key=True)
    group_expense = models.ForeignKey(GroupExpense, on_delete=models.CASCADE, related_name='shares')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='expense_shares')
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['group_expense']),
            models.Index(fields=['contact']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['group_expense', 'contact'], name='unique_expense_contact_share')
        ]
    
    @property
    def is_settled(self):
        return self.paid_amount >= self.share_amount
    
    @property
    def remaining_amount(self):
        return max(self.share_amount - self.paid_amount, 0)
    
    def __str__(self):
        return f"{self.contact.name} - ${self.share_amount} (${self.paid_amount} paid)"


# Lending Models
class LendingTransaction(models.Model):
    """Money lent to or borrowed from others"""
    TRANSACTION_TYPES = [
        ('lent', 'Money Lent'),
        ('borrowed', 'Money Borrowed'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('repaid', 'Fully Repaid'),
        ('written_off', 'Written Off'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lending_transactions')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='lending_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    description = models.TextField()
    date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['contact']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['date']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.contact.name} - ${self.amount}"
    
    @property
    def total_repaid(self):
        return sum(repayment.amount for repayment in self.repayments.all())
    
    @property
    def remaining_balance(self):
        return max(self.amount - self.total_repaid, 0)
    
    @property
    def is_overdue(self):
        from django.utils import timezone
        return (self.due_date and 
                self.due_date < timezone.now().date() and 
                self.status == 'active' and 
                self.remaining_balance > 0)


class LendingRepayment(models.Model):
    """Repayments for lending transactions"""
    id = models.AutoField(primary_key=True)
    lending_transaction = models.ForeignKey(LendingTransaction, on_delete=models.CASCADE, related_name='repayments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['lending_transaction']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"Repayment - ${self.amount} ({self.date})"


class SubscriptionPlan(models.Model):
    """Subscription plans available for users"""
    PLAN_TYPES = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES, unique=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    ai_credits_per_month = models.IntegerField(default=0)
    max_transactions_per_month = models.IntegerField(default=100)
    max_accounts = models.IntegerField(default=3)
    features = models.JSONField(default=dict)  # Store feature flags
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} Plan"


class UserSubscription(models.Model):
    """User's current subscription"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('canceled', 'Canceled'),
        ('expired', 'Expired'),
        ('trial', 'Trial'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    ai_credits_remaining = models.IntegerField(default=0)
    ai_credits_used_this_month = models.IntegerField(default=0)
    transactions_this_month = models.IntegerField(default=0)
    last_reset_date = models.DateTimeField(auto_now_add=True)
    is_auto_renew = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['end_date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.name}"


class UserAISettings(models.Model):
    """User's AI configuration and API keys"""
    AI_PROVIDERS = [
        ('openai', 'OpenAI'),
        ('ollama', 'Ollama'),
        ('system', 'System Default'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_settings')
    preferred_provider = models.CharField(max_length=20, choices=AI_PROVIDERS, default='system')
    openai_api_key = models.TextField(blank=True)  # Encrypted
    openai_model = models.CharField(max_length=100, default='gpt-3.5-turbo')
    ollama_endpoint = models.URLField(blank=True)
    ollama_model = models.CharField(max_length=100, default='llama2')
    enable_ai_suggestions = models.BooleanField(default=True)
    enable_ai_categorization = models.BooleanField(default=True)
    enable_ai_invoice_generation = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} AI Settings"


class AIUsageLog(models.Model):
    """Track AI usage for billing and analytics"""
    USAGE_TYPES = [
        ('categorization', 'Transaction Categorization'),
        ('invoice_generation', 'Invoice Generation'),
        ('data_analysis', 'Data Analysis'),
        ('suggestions', 'Smart Suggestions'),
        ('bill_parsing', 'Bill/Receipt Parsing'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_usage')
    usage_type = models.CharField(max_length=50, choices=USAGE_TYPES)
    provider = models.CharField(max_length=20, default='system')
    model_used = models.CharField(max_length=100)
    credits_consumed = models.IntegerField(default=1)
    tokens_used = models.IntegerField(default=0)
    input_data = models.TextField(blank=True)  # Store request data for debugging
    output_data = models.TextField(blank=True)  # Store response data
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    processing_time = models.FloatField(default=0.0)  # In seconds
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['usage_type', 'created_at']),
            models.Index(fields=['success']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.usage_type} ({self.created_at})"


class Invoice(models.Model):
    """AI-generated invoices and bills"""
    INVOICE_TYPES = [
        ('invoice', 'Invoice'),
        ('bill', 'Bill'),
        ('receipt', 'Receipt'),
        ('estimate', 'Estimate'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('canceled', 'Canceled'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPES, default='invoice')
    invoice_number = models.CharField(max_length=100)
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
    
    # AI generation info
    generated_by_ai = models.BooleanField(default=False)
    ai_prompt_used = models.TextField(blank=True)
    ai_usage_log = models.ForeignKey(AIUsageLog, on_delete=models.SET_NULL, null=True, blank=True)
    
    # File storage
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['due_date']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'invoice_number'], name='unique_user_invoice_number')
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client_name}"


class PlanAddon(models.Model):
    """Available add-ons for subscription plans"""
    ADDON_TYPES = [
        ('credits', 'AI Credits'),
        ('transactions', 'Transaction Limit'),
        ('accounts', 'Account Limit'),
        ('storage', 'Storage Space'),
        ('integrations', 'API Integrations'),
        ('support', 'Priority Support'),
        ('features', 'Premium Features'),
    ]
    
    BILLING_CYCLES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        ('one_time', 'One Time'),
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    addon_type = models.CharField(max_length=20, choices=ADDON_TYPES)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLES, default='monthly')
    
    # Addon configuration
    credits_amount = models.IntegerField(default=0)  # For AI credits
    transaction_increase = models.IntegerField(default=0)  # For transaction limits
    account_increase = models.IntegerField(default=0)  # For account limits
    storage_gb = models.IntegerField(default=0)  # For storage
    feature_flags = models.JSONField(default=dict)  # For feature toggles
    
    # Availability
    compatible_plans = models.ManyToManyField(SubscriptionPlan, blank=True)
    is_active = models.BooleanField(default=True)
    is_stackable = models.BooleanField(default=True)  # Can user buy multiple?
    max_quantity = models.IntegerField(default=1)  # Max quantity per user
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['addon_type', 'is_active']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.price}/{self.billing_cycle}"


class UserPlanCustomization(models.Model):
    """User's customized plan with add-ons"""
    id = models.AutoField(primary_key=True)
    user_subscription = models.OneToOneField(
        UserSubscription, 
        on_delete=models.CASCADE, 
        related_name='customization'
    )
    
    # Customized limits (base plan + add-ons)
    total_ai_credits = models.IntegerField(default=0)
    total_transactions_limit = models.IntegerField(default=0)
    total_accounts_limit = models.IntegerField(default=0)
    total_storage_gb = models.IntegerField(default=0)
    
    # Custom features (merged from base plan + add-ons)
    custom_features = models.JSONField(default=dict)
    
    # Billing
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def calculate_totals(self):
        """Calculate total limits and costs from base plan + add-ons"""
        base_plan = self.user_subscription.plan
        
        # Start with base plan
        self.total_ai_credits = base_plan.ai_credits_per_month
        self.total_transactions_limit = base_plan.max_transactions_per_month
        self.total_accounts_limit = base_plan.max_accounts
        self.total_storage_gb = 1  # Base storage
        self.custom_features = base_plan.features.copy()
        self.total_monthly_cost = base_plan.price
        
        # Add all active add-ons
        for addon_instance in self.addon_instances.filter(is_active=True):
            addon = addon_instance.addon
            quantity = addon_instance.quantity
            
            self.total_ai_credits += addon.credits_amount * quantity
            self.total_transactions_limit += addon.transaction_increase * quantity
            self.total_accounts_limit += addon.account_increase * quantity
            self.total_storage_gb += addon.storage_gb * quantity
            
            # Merge feature flags
            for feature, enabled in addon.feature_flags.items():
                if enabled:
                    self.custom_features[feature] = True
            
            # Add to monthly cost (convert if needed)
            if addon.billing_cycle == 'monthly':
                self.total_monthly_cost += addon.price * quantity
            elif addon.billing_cycle == 'yearly':
                self.total_monthly_cost += (addon.price * quantity) / 12
        
        self.save()
    
    def __str__(self):
        return f"{self.user_subscription.user.username} - Customized Plan"


class UserAddonInstance(models.Model):
    """User's purchased add-on instances"""
    id = models.AutoField(primary_key=True)
    customization = models.ForeignKey(
        UserPlanCustomization, 
        on_delete=models.CASCADE, 
        related_name='addon_instances'
    )
    addon = models.ForeignKey(PlanAddon, on_delete=models.CASCADE)
    
    quantity = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    # Billing information
    monthly_cost = models.DecimalField(max_digits=8, decimal_places=2)
    next_billing_date = models.DateTimeField()
    auto_renew = models.BooleanField(default=True)
    
    # Usage tracking
    credits_used = models.IntegerField(default=0)  # For credit add-ons
    last_reset_date = models.DateTimeField(auto_now_add=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['customization', 'is_active']),
            models.Index(fields=['next_billing_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['customization', 'addon'], 
                condition=models.Q(is_active=True),
                name='unique_active_addon_per_user'
            )
        ]
    
    def save(self, *args, **kwargs):
        # Calculate monthly cost based on billing cycle
        if self.addon.billing_cycle == 'monthly':
            self.monthly_cost = self.addon.price * self.quantity
        elif self.addon.billing_cycle == 'yearly':
            self.monthly_cost = (self.addon.price * self.quantity) / 12
        else:  # one_time
            self.monthly_cost = 0
        
        super().save(*args, **kwargs)
        
        # Recalculate customization totals
        self.customization.calculate_totals()
    
    def __str__(self):
        return f"{self.customization.user_subscription.user.username} - {self.addon.name} x{self.quantity}"


class PlanTemplate(models.Model):
    """Pre-defined plan templates with add-on combinations"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    base_plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    included_addons = models.ManyToManyField(PlanAddon, through='TemplateAddon')
    
    # Marketing
    is_featured = models.BooleanField(default=False)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Targeting
    target_user_types = models.JSONField(default=list)  # ['freelancer', 'agency', 'enterprise']
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def calculate_total_price(self):
        """Calculate total price including discounts"""
        total = self.base_plan.price
        
        for template_addon in self.template_addons.all():
            addon = template_addon.addon
            quantity = template_addon.quantity
            
            if addon.billing_cycle == 'monthly':
                total += addon.price * quantity
            elif addon.billing_cycle == 'yearly':
                total += (addon.price * quantity) / 12
        
        # Apply discount
        if self.discount_percentage > 0:
            from decimal import Decimal
            discount_factor = Decimal(1) - (self.discount_percentage / Decimal(100))
            total = total * discount_factor
        
        self.total_price = total
        self.save()
        
        return total
    
    def __str__(self):
        return f"{self.name} Template"


class TemplateAddon(models.Model):
    """Add-ons included in plan templates"""
    template = models.ForeignKey(PlanTemplate, on_delete=models.CASCADE, related_name='template_addons')
    addon = models.ForeignKey(PlanAddon, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    
    class Meta:
        unique_together = ['template', 'addon']


class UserPlanHistory(models.Model):
    """Track user's plan change history"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plan_history')
    
    # Plan change details
    previous_plan = models.ForeignKey(
        SubscriptionPlan, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='previous_subscriptions'
    )
    new_plan = models.ForeignKey(
        SubscriptionPlan, 
        on_delete=models.CASCADE, 
        related_name='new_subscriptions'
    )
    
    # Change reason and context
    change_reason = models.CharField(max_length=50, choices=[
        ('upgrade', 'Plan Upgrade'),
        ('downgrade', 'Plan Downgrade'),
        ('addon_purchase', 'Add-on Purchase'),
        ('addon_removal', 'Add-on Removal'),
        ('template_applied', 'Template Applied'),
        ('admin_change', 'Admin Change'),
    ])
    
    # Financial impact
    cost_difference = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    effective_date = models.DateTimeField()
    
    # Metadata
    changed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='plan_changes_made'
    )
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['change_reason']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.change_reason} ({self.created_at.date()})"


class RecurringTransaction(models.Model):
    """Automated recurring transactions (subscriptions, bills, income)"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('semi_annually', 'Semi-annually'),
        ('annually', 'Annually'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    EXECUTION_MODES = [
        ('auto', 'Automatic'),
        ('manual', 'Manual Approval'),
        ('notify', 'Notification Only'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recurring_transactions')
    
    # Basic transaction details
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=Transaction.TRANSACTION_TYPES)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Recurrence settings
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    custom_frequency_days = models.IntegerField(null=True, blank=True)  # For custom frequency
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # Optional end date
    next_execution_date = models.DateField()
    
    # Execution settings
    execution_mode = models.CharField(max_length=20, choices=EXECUTION_MODES, default='auto')
    auto_categorize = models.BooleanField(default=True)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    total_executions = models.IntegerField(default=0)
    max_executions = models.IntegerField(null=True, blank=True)  # Optional limit
    last_execution_date = models.DateField(null=True, blank=True)
    
    # Variability settings
    allow_amount_variance = models.BooleanField(default=False)
    variance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # +/- percentage
    
    # Notifications
    notify_before_days = models.IntegerField(default=1)
    notify_on_execution = models.BooleanField(default=True)
    notify_on_failure = models.BooleanField(default=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['next_execution_date', 'status']),
            models.Index(fields=['frequency']),
        ]
    
    def calculate_next_execution_date(self):
        """Calculate the next execution date based on frequency"""
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        
        if not self.last_execution_date:
            base_date = self.start_date
        else:
            base_date = self.last_execution_date
        
        if self.frequency == 'daily':
            next_date = base_date + timedelta(days=1)
        elif self.frequency == 'weekly':
            next_date = base_date + timedelta(weeks=1)
        elif self.frequency == 'biweekly':
            next_date = base_date + timedelta(weeks=2)
        elif self.frequency == 'monthly':
            next_date = base_date + relativedelta(months=1)
        elif self.frequency == 'quarterly':
            next_date = base_date + relativedelta(months=3)
        elif self.frequency == 'semi_annually':
            next_date = base_date + relativedelta(months=6)
        elif self.frequency == 'annually':
            next_date = base_date + relativedelta(years=1)
        elif self.frequency == 'custom' and self.custom_frequency_days:
            next_date = base_date + timedelta(days=self.custom_frequency_days)
        else:
            next_date = base_date + timedelta(days=30)  # Default to monthly
        
        self.next_execution_date = next_date
        return next_date
    
    def execute_transaction(self, actual_amount=None):
        """Execute the recurring transaction"""
        from datetime import date
        
        if self.status != 'active':
            return None, f"Recurring transaction is {self.status}"
        
        # Check if we've reached max executions
        if self.max_executions and self.total_executions >= self.max_executions:
            self.status = 'completed'
            self.save()
            return None, "Maximum executions reached"
        
        # Use actual amount or default amount
        amount = actual_amount or self.amount
        
        # Check variance if enabled
        if self.allow_amount_variance and actual_amount:
            variance = abs((actual_amount - self.amount) / self.amount * 100)
            if variance > self.variance_percentage:
                return None, f"Amount variance ({variance:.1f}%) exceeds allowed limit ({self.variance_percentage}%)"
        
        # Create the transaction
        transaction = Transaction.objects.create(
            user=self.user,
            account=self.account,
            description=f"[Recurring] {self.description}",
            amount=str(amount),
            date=date.today(),
            transaction_type=self.transaction_type,
            category=self.category,
            verified=True,
            tags=self.tags,
            notes=f"Auto-generated from recurring transaction #{self.id}"
        )
        
        # Update recurring transaction
        self.total_executions += 1
        self.last_execution_date = date.today()
        self.calculate_next_execution_date()
        
        # Check if we should complete
        if self.end_date and date.today() >= self.end_date:
            self.status = 'completed'
        elif self.max_executions and self.total_executions >= self.max_executions:
            self.status = 'completed'
        
        self.save()
        
        return transaction, "Transaction executed successfully"
    
    def __str__(self):
        return f"{self.description} - {self.frequency} ({self.status})"


class RecurringTransactionExecution(models.Model):
    """Track individual executions of recurring transactions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('executed', 'Executed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    recurring_transaction = models.ForeignKey(
        RecurringTransaction, 
        on_delete=models.CASCADE, 
        related_name='executions'
    )
    scheduled_date = models.DateField()
    executed_date = models.DateField(null=True, blank=True)
    
    # Execution details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    actual_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_transaction = models.ForeignKey(
        Transaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    next_retry_date = models.DateTimeField(null=True, blank=True)
    
    # Manual approval
    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_executions'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['scheduled_date', 'status']),
            models.Index(fields=['recurring_transaction', 'status']),
        ]
        unique_together = ['recurring_transaction', 'scheduled_date']
    
    def __str__(self):
        return f"{self.recurring_transaction.description} - {self.scheduled_date} ({self.status})"


class Investment(models.Model):
    """Investment holdings and portfolio tracking"""
    INVESTMENT_TYPES = [
        ('stock', 'Stock'),
        ('bond', 'Bond'),
        ('etf', 'ETF'),
        ('mutual_fund', 'Mutual Fund'),
        ('crypto', 'Cryptocurrency'),
        ('commodity', 'Commodity'),
        ('real_estate', 'Real Estate'),
        ('option', 'Option'),
        ('future', 'Future'),
        ('other', 'Other'),
    ]
    
    INVESTMENT_STATUS = [
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('expired', 'Expired'),
        ('transferred', 'Transferred'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='investments')
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    
    # Investment details
    symbol = models.CharField(max_length=20)  # Ticker symbol
    name = models.CharField(max_length=255)
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES)
    
    # Position details
    quantity = models.DecimalField(max_digits=15, decimal_places=6)
    average_cost_per_share = models.DecimalField(max_digits=12, decimal_places=4)
    total_cost_basis = models.DecimalField(max_digits=15, decimal_places=2)
    current_price = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Performance metrics
    unrealized_gain_loss = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    unrealized_gain_loss_percentage = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    realized_gain_loss = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Dates
    purchase_date = models.DateField()
    last_price_update = models.DateTimeField(null=True, blank=True)
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=INVESTMENT_STATUS, default='active')
    currency = models.CharField(max_length=3, default='USD')
    exchange = models.CharField(max_length=50, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    
    # Automatic tracking
    auto_update_price = models.BooleanField(default=True)
    price_alerts_enabled = models.BooleanField(default=False)
    target_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    stop_loss_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['symbol', 'investment_type']),
            models.Index(fields=['purchase_date']),
        ]
    
    def update_current_value(self):
        """Update current value based on current price and quantity"""
        self.current_value = self.current_price * self.quantity
        self.unrealized_gain_loss = self.current_value - self.total_cost_basis
        
        if self.total_cost_basis > 0:
            self.unrealized_gain_loss_percentage = (
                self.unrealized_gain_loss / self.total_cost_basis * 100
            )
        
        self.save()
    
    def add_transaction(self, transaction_type, quantity, price_per_share, date=None):
        """Add a buy/sell transaction for this investment"""
        from datetime import date as dt_date
        
        if not date:
            date = dt_date.today()
        
        # Create investment transaction record
        InvestmentTransaction.objects.create(
            investment=self,
            transaction_type=transaction_type,
            quantity=quantity,
            price_per_share=price_per_share,
            total_amount=quantity * price_per_share,
            transaction_date=date
        )
        
        # Update position
        if transaction_type == 'buy':
            new_total_cost = self.total_cost_basis + (quantity * price_per_share)
            new_quantity = self.quantity + quantity
            self.average_cost_per_share = new_total_cost / new_quantity if new_quantity > 0 else 0
            self.quantity = new_quantity
            self.total_cost_basis = new_total_cost
        elif transaction_type == 'sell':
            # Calculate realized gain/loss
            cost_of_sold_shares = quantity * self.average_cost_per_share
            proceeds = quantity * price_per_share
            realized_gain = proceeds - cost_of_sold_shares
            
            self.realized_gain_loss += realized_gain
            self.quantity -= quantity
            self.total_cost_basis -= cost_of_sold_shares
            
            if self.quantity <= 0:
                self.status = 'sold'
        
        self.save()
    
    def __str__(self):
        return f"{self.symbol} - {self.quantity} shares @ ${self.current_price}"


class InvestmentTransaction(models.Model):
    """Individual buy/sell transactions for investments"""
    TRANSACTION_TYPES = [
        ('buy', 'Buy'),
        ('sell', 'Sell'),
        ('dividend', 'Dividend'),
        ('split', 'Stock Split'),
        ('merger', 'Merger'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
    ]
    
    id = models.AutoField(primary_key=True)
    investment = models.ForeignKey(Investment, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    
    # Transaction details
    quantity = models.DecimalField(max_digits=15, decimal_places=6)
    price_per_share = models.DecimalField(max_digits=12, decimal_places=4)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transaction_date = models.DateField()
    
    # Links to main transaction system
    linked_transaction = models.ForeignKey(
        Transaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    external_id = models.CharField(max_length=100, blank=True)  # Broker transaction ID
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['investment', 'transaction_date']),
            models.Index(fields=['transaction_type', 'transaction_date']),
        ]
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.transaction_type.title()} {self.quantity} {self.investment.symbol} @ ${self.price_per_share}"


class InvestmentPortfolio(models.Model):
    """Portfolio groupings and performance tracking"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolios')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Portfolio settings
    benchmark_symbol = models.CharField(max_length=20, default='SPY')  # Comparison benchmark
    target_allocation = models.JSONField(default=dict)  # Asset allocation targets
    rebalance_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=5.0)  # %
    
    # Performance tracking
    total_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_cost_basis = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_gain_loss = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_gain_loss_percentage = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    
    # Risk metrics
    beta = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    sharpe_ratio = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    volatility = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    
    # Metadata
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user'], 
                condition=models.Q(is_default=True),
                name='unique_default_portfolio_per_user'
            )
        ]
    
    def calculate_performance_metrics(self):
        """Calculate portfolio performance metrics"""
        investments = Investment.objects.filter(
            user=self.user,
            status='active'
        )
        
        total_value = sum(inv.current_value for inv in investments)
        total_cost = sum(inv.total_cost_basis for inv in investments)
        
        self.total_value = total_value
        self.total_cost_basis = total_cost
        self.total_gain_loss = total_value - total_cost
        
        if total_cost > 0:
            self.total_gain_loss_percentage = (self.total_gain_loss / total_cost) * 100
        
        self.save()
    
    def get_asset_allocation(self):
        """Get current asset allocation by investment type"""
        investments = Investment.objects.filter(
            user=self.user,
            status='active'
        )
        
        allocation = {}
        total_value = sum(inv.current_value for inv in investments)
        
        if total_value > 0:
            for inv in investments:
                inv_type = inv.get_investment_type_display()
                if inv_type not in allocation:
                    allocation[inv_type] = {'value': 0, 'percentage': 0}
                
                allocation[inv_type]['value'] += inv.current_value
                allocation[inv_type]['percentage'] = (
                    allocation[inv_type]['value'] / total_value * 100
                )
        
        return allocation
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"


class InvestmentPriceHistory(models.Model):
    """Historical price data for investments"""
    id = models.AutoField(primary_key=True)
    symbol = models.CharField(max_length=20, db_index=True)
    date = models.DateField()
    
    # OHLC data
    open_price = models.DecimalField(max_digits=12, decimal_places=4)
    high_price = models.DecimalField(max_digits=12, decimal_places=4)
    low_price = models.DecimalField(max_digits=12, decimal_places=4)
    close_price = models.DecimalField(max_digits=12, decimal_places=4)
    volume = models.BigIntegerField(default=0)
    
    # Calculated fields
    adjusted_close = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['symbol', 'date']),
            models.Index(fields=['date']),
        ]
        unique_together = ['symbol', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.symbol} - {self.date}: ${self.close_price}"