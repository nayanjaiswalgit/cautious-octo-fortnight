"""
Highly optimized Django models with algorithmic data storage
Reduces 33+ models to 8 core models using smart data structures and JSON fields
"""

import uuid
import json
from decimal import Decimal
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from cryptography.fernet import Fernet
from django.conf import settings


# ================================
# BASE CLASSES
# ================================

class BaseModel(models.Model):
    """Universal base model with common fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)  # Extensible data storage
    
    class Meta:
        abstract = True


class UserOwnedModel(BaseModel):
    """Base for user-owned entities"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        abstract = True


# ================================
# CORE OPTIMIZED MODELS
# ================================

class UserProfile(BaseModel):
    """Consolidated user profile - replaces UserSubscription, UserAISettings, UserPlanCustomization"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Dynamic configuration using JSON - stores all settings
    config = models.JSONField(default=dict)
    # Structure: {
    #   'subscription': {
    #       'plan_id': 'basic',
    #       'status': 'active',
    #       'start_date': '2024-01-01',
    #       'end_date': '2024-12-31',
    #       'auto_renew': true
    #   },
    #   'usage': {
    #       'ai_credits_remaining': 500,
    #       'ai_credits_used_this_month': 100,
    #       'transactions_this_month': 150,
    #       'last_reset_date': '2024-01-01'
    #   },
    #   'ai_settings': {
    #       'provider': 'openai',
    #       'api_key': 'encrypted_key',
    #       'model': 'gpt-3.5-turbo',
    #       'features': {'suggestions': true, 'categorization': true}
    #   },
    #   'plan_customization': {
    #       'addons': [{'id': 'extra_credits', 'quantity': 2}],
    #       'limits': {'ai_credits': 1000, 'transactions': 5000},
    #       'features': {'api_access': true, 'priority_support': true}
    #   },
    #   'preferences': {
    #       'currency': 'USD',
    #       'timezone': 'UTC',
    #       'language': 'en'
    #   }
    # }
    
    # Quick access fields (denormalized for performance)
    current_plan = models.CharField(max_length=50, default='free')
    subscription_status = models.CharField(max_length=20, default='trial')
    ai_credits_remaining = models.IntegerField(default=100)
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['subscription_status']),
            models.Index(fields=['current_plan']),
        ]
    
    def get_config_value(self, path, default=None):
        """Get nested config value using dot notation: 'subscription.status'"""
        keys = path.split('.')
        value = self.config
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set_config_value(self, path, value):
        """Set nested config value using dot notation"""
        keys = path.split('.')
        config = self.config.copy()
        current = config
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
        self.config = config
        self.save()
    
    def consume_credits(self, amount):
        """Consume AI credits"""
        if self.ai_credits_remaining >= amount:
            self.ai_credits_remaining -= amount
            self.set_config_value('usage.ai_credits_used_this_month', 
                                self.get_config_value('usage.ai_credits_used_this_month', 0) + amount)
            self.save()
            return True
        return False


class Entity(UserOwnedModel):
    """Universal entity model - replaces Account, Contact, Category, Tag, Investment"""
    
    ENTITY_TYPES = [
        ('account', 'Financial Account'),
        ('contact', 'Contact/Person'),
        ('category', 'Transaction Category'),
        ('tag', 'Tag'),
        ('investment', 'Investment'),
        ('goal', 'Financial Goal'),
    ]
    
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)  # Symbol for investments, account number, etc.
    
    # Polymorphic data storage using JSON
    data = models.JSONField(default=dict)
    # Structure varies by entity_type:
    # account: {'type': 'checking', 'balance': 1000.00, 'currency': 'USD', 'institution': 'Bank'}
    # contact: {'email': 'test@test.com', 'phone': '123-456-7890', 'address': '123 Main St'}
    # category: {'type': 'expense', 'color': '#FF0000', 'icon': 'shopping', 'parent_id': 'uuid'}
    # tag: {'color': '#00FF00', 'usage_count': 10}
    # investment: {'type': 'stock', 'current_price': 150.00, 'sector': 'tech', 'risk': 'medium'}
    # goal: {'type': 'savings', 'target': 10000.00, 'current': 2500.00, 'target_date': '2024-12-31'}
    
    # Tags for any entity (replaces separate tag relationships)
    tags = models.JSONField(default=list)  # ['personal', 'business', 'important']
    
    # Relationships using JSON arrays for flexibility
    relationships = models.JSONField(default=dict)
    # Structure: {
    #   'parent': 'parent_entity_uuid',  # For category hierarchy
    #   'children': ['child1_uuid', 'child2_uuid'],
    #   'linked_accounts': ['account1_uuid'],  # For investments linked to accounts
    #   'portfolio': 'portfolio_name'  # For investment grouping
    # }
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'entity_type']),
            models.Index(fields=['entity_type', 'is_active']),
            models.Index(fields=['code']),
            models.Index(fields=['name']),
        ]
        unique_together = ['user', 'entity_type', 'code']
    
    def __str__(self):
        return f"{self.name} ({self.entity_type})"
    
    def get_data_value(self, key, default=None):
        """Get value from data JSON"""
        return self.data.get(key, default)
    
    def set_data_value(self, key, value):
        """Set value in data JSON"""
        data = self.data.copy()
        data[key] = value
        self.data = data
        self.save()
    
    def add_relationship(self, relationship_type, target_id):
        """Add relationship to another entity"""
        relationships = self.relationships.copy()
        if relationship_type not in relationships:
            relationships[relationship_type] = []
        if isinstance(relationships[relationship_type], list):
            if target_id not in relationships[relationship_type]:
                relationships[relationship_type].append(str(target_id))
        else:
            relationships[relationship_type] = str(target_id)
        self.relationships = relationships
        self.save()
    
    def add_tag(self, tag_name):
        """Add tag to entity"""
        tag_name = tag_name.strip().lower()
        if tag_name and tag_name not in self.tags:
            tags = self.tags.copy()
            tags.append(tag_name)
            self.tags = tags
            self.save()
    
    def remove_tag(self, tag_name):
        """Remove tag from entity"""
        tag_name = tag_name.strip().lower()
        if tag_name in self.tags:
            tags = self.tags.copy()
            tags.remove(tag_name)
            self.tags = tags
            self.save()
    
    def has_tag(self, tag_name):
        """Check if entity has a specific tag"""
        return tag_name.strip().lower() in self.tags
    
    def set_tags(self, tag_list):
        """Set all tags for entity (replaces existing tags)"""
        self.tags = [tag.strip().lower() for tag in tag_list if tag.strip()]
        self.save()
    
    @property
    def balance(self):
        """For account entities"""
        if self.entity_type == 'account':
            return Decimal(str(self.get_data_value('balance', 0)))
        return Decimal('0')
    
    @property
    def current_price(self):
        """For investment entities"""
        if self.entity_type == 'investment':
            return Decimal(str(self.get_data_value('current_price', 0)))
        return Decimal('0')


class Transaction(UserOwnedModel):
    """Universal transaction model - replaces Transaction, RecurringTransaction, InvestmentTransaction, LendingTransaction"""
    
    TRANSACTION_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
        ('investment_buy', 'Buy Investment'),
        ('investment_sell', 'Sell Investment'),
        ('lending', 'Lending/Borrowing'),
        ('recurring', 'Recurring Template'),
        ('group_expense', 'Group Expense'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
        ('template', 'Template'),
    ]
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Core transaction data
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    date = models.DateField()
    
    # Entity relationships (flexible references)
    primary_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='primary_transactions')
    secondary_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, null=True, blank=True, related_name='secondary_transactions')
    
    # Polymorphic transaction data using JSON
    transaction_data = models.JSONField(default=dict)
    # Structure varies by transaction_type:
    # Standard: {'currency': 'USD', 'merchant': 'Store Name', 'verified': true}
    # Investment: {'quantity': 100, 'price_per_unit': 150.00, 'fees': 9.99, 'symbol': 'AAPL'}
    # Lending: {'due_date': '2024-12-31', 'interest_rate': 5.5, 'contact_name': 'John Doe'}
    # Recurring: {'frequency': 'monthly', 'next_execution': '2024-02-01', 'end_date': '2024-12-31', 'auto_execute': true}
    # Group: {'total_amount': 100.00, 'split_method': 'equal', 'participants': [{'name': 'John', 'amount': 50.00}]}
    
    # Tags and categories as JSON arrays for flexibility
    tags = models.JSONField(default=list)  # ['food', 'restaurant', 'business']
    categories = models.JSONField(default=list)  # ['expense', 'dining', 'business_meal']
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['primary_entity']),
            models.Index(fields=['amount']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.description} - {self.amount} ({self.date})"
    
    def get_transaction_data_value(self, key, default=None):
        """Get value from transaction_data JSON"""
        return self.transaction_data.get(key, default)
    
    def set_transaction_data_value(self, key, value):
        """Set value in transaction_data JSON"""
        data = self.transaction_data.copy()
        data[key] = value
        self.transaction_data = data
        self.save()
    
    def add_tag(self, tag_name):
        """Add tag to transaction"""
        if tag_name not in self.tags:
            tags = self.tags.copy()
            tags.append(tag_name)
            self.tags = tags
            self.save()
    
    def add_category(self, category_name):
        """Add category to transaction"""
        if category_name not in self.categories:
            categories = self.categories.copy()
            categories.append(category_name)
            self.categories = categories
            self.save()
    
    def execute_recurring(self):
        """Execute recurring transaction template"""
        if self.status != 'template' or self.transaction_type != 'recurring':
            return None
        
        # Create new transaction from template
        new_transaction = Transaction.objects.create(
            user=self.user,
            transaction_type=self.get_transaction_data_value('original_type', 'expense'),
            amount=self.amount,
            description=f"Auto: {self.description}",
            date=timezone.now().date(),
            primary_entity=self.primary_entity,
            secondary_entity=self.secondary_entity,
            transaction_data={
                'auto_generated': True,
                'template_id': str(self.id),
                'currency': self.get_transaction_data_value('currency', 'USD')
            },
            tags=self.tags.copy(),
            categories=self.categories.copy()
        )
        
        # Update next execution date
        self.update_next_execution()
        
        return new_transaction
    
    def update_next_execution(self):
        """Update next execution date for recurring transactions"""
        if self.transaction_type != 'recurring':
            return
        
        frequency = self.get_transaction_data_value('frequency', 'monthly')
        current_next = self.get_transaction_data_value('next_execution')
        
        if current_next:
            from datetime import datetime
            next_date = datetime.fromisoformat(current_next).date()
            
            if frequency == 'daily':
                next_date += timedelta(days=1)
            elif frequency == 'weekly':
                next_date += timedelta(weeks=1)
            elif frequency == 'monthly':
                next_date += timedelta(days=30)  # Approximate
            elif frequency == 'yearly':
                next_date += timedelta(days=365)
            
            self.set_transaction_data_value('next_execution', next_date.isoformat())


class Plan(BaseModel):
    """Universal plan model - replaces SubscriptionPlan, PlanAddon, PlanTemplate"""
    
    PLAN_TYPES = [
        ('base', 'Base Subscription Plan'),
        ('addon', 'Add-on Feature'),
        ('bundle', 'Bundle Package'),
    ]
    
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)  # free, basic, premium, extra_credits, etc.
    
    # Pricing and billing
    price = models.DecimalField(max_digits=8, decimal_places=2)
    billing_cycle = models.CharField(max_length=20, default='monthly')
    
    # Plan configuration using JSON for maximum flexibility
    config = models.JSONField(default=dict)
    # Structure: {
    #   'limits': {
    #       'ai_credits_per_month': 100,
    #       'max_transactions_per_month': 1000,
    #       'max_accounts': 3,
    #       'storage_gb': 1
    #   },
    #   'features': {
    #       'api_access': false,
    #       'priority_support': false,
    #       'custom_reports': false,
    #       'white_label': false
    #   },
    #   'addon_settings': {
    #       'is_stackable': true,
    #       'max_quantity': 10,
    #       'compatible_plans': ['basic', 'premium']
    #   },
    #   'bundle_settings': {
    #       'base_plan': 'premium',
    #       'included_addons': [{'code': 'extra_credits', 'quantity': 2}],
    #       'discount_percentage': 15
    #   }
    # }
    
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['plan_type', 'is_active']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.plan_type})"
    
    def get_limit(self, limit_name, default=0):
        """Get plan limit value"""
        return self.config.get('limits', {}).get(limit_name, default)
    
    def has_feature(self, feature_name):
        """Check if plan has specific feature"""
        return self.config.get('features', {}).get(feature_name, False)
    
    def calculate_total_cost(self, user_addons=None):
        """Calculate total cost including addons"""
        total = self.price
        
        if user_addons:
            for addon_data in user_addons:
                addon = Plan.objects.get(code=addon_data['code'])
                quantity = addon_data.get('quantity', 1)
                if addon.billing_cycle == 'monthly':
                    total += addon.price * quantity
                elif addon.billing_cycle == 'yearly':
                    total += (addon.price * quantity) / 12
        
        return total


class Activity(UserOwnedModel):
    """Universal activity log - replaces AIUsageLog, RecurringTransactionExecution, UserPlanHistory, etc."""
    
    ACTIVITY_TYPES = [
        ('transaction', 'Transaction Activity'),
        ('ai_usage', 'AI Service Usage'),
        ('plan_change', 'Plan/Subscription Change'),
        ('system', 'System Activity'),
        ('user_action', 'User Action'),
    ]
    
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    action = models.CharField(max_length=100)  # 'executed_recurring', 'used_ai', 'changed_plan', etc.
    
    # Flexible data storage for different activity types
    activity_data = models.JSONField(default=dict)
    # Structure varies by activity_type:
    # transaction: {'transaction_id': 'uuid', 'amount': 100.00, 'status': 'completed'}
    # ai_usage: {'provider': 'openai', 'model': 'gpt-3.5-turbo', 'credits_used': 10, 'success': true}
    # plan_change: {'old_plan': 'basic', 'new_plan': 'premium', 'reason': 'upgrade'}
    # system: {'process': 'backup', 'status': 'completed', 'duration': 120}
    
    # Related entities (optional)
    related_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, null=True, blank=True)
    related_transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True)
    
    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action']),
            models.Index(fields=['related_entity']),
            models.Index(fields=['related_transaction']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.action} ({self.activity_type})"


class Document(UserOwnedModel):
    """Universal document storage - replaces Invoice, UploadSession, etc."""
    
    DOCUMENT_TYPES = [
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('statement', 'Bank Statement'),
        ('report', 'Report'),
        ('contract', 'Contract'),
        ('other', 'Other Document'),
    ]
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # File storage
    file_path = models.FileField(upload_to='documents/', null=True, blank=True)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=50, blank=True)
    
    # Document-specific data using JSON
    document_data = models.JSONField(default=dict)
    # Structure varies by document_type:
    # invoice: {'number': 'INV-001', 'client': 'John Doe', 'amount': 1000.00, 'due_date': '2024-12-31', 'status': 'sent'}
    # statement: {'account_id': 'uuid', 'period_start': '2024-01-01', 'period_end': '2024-01-31', 'transaction_count': 25}
    # receipt: {'merchant': 'Store Name', 'amount': 50.00, 'date': '2024-01-15', 'category': 'groceries'}
    
    # AI processing data
    ai_processed = models.BooleanField(default=False)
    ai_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_extracted_data = models.JSONField(default=dict, blank=True)
    
    # Related entities
    related_entities = models.JSONField(default=list)  # Array of entity UUIDs
    related_transactions = models.JSONField(default=list)  # Array of transaction UUIDs
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'document_type']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ai_processed']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.document_type})"
    
    def get_document_data_value(self, key, default=None):
        """Get value from document_data JSON"""
        return self.document_data.get(key, default)
    
    def set_document_data_value(self, key, value):
        """Set value in document_data JSON"""
        data = self.document_data.copy()
        data[key] = value
        self.document_data = data
        self.save()
    
    def add_related_entity(self, entity_id):
        """Add related entity"""
        if str(entity_id) not in self.related_entities:
            entities = self.related_entities.copy()
            entities.append(str(entity_id))
            self.related_entities = entities
            self.save()
    
    def add_related_transaction(self, transaction_id):
        """Add related transaction"""
        if str(transaction_id) not in self.related_transactions:
            transactions = self.related_transactions.copy()
            transactions.append(str(transaction_id))
            self.related_transactions = transactions
            self.save()


class SystemConfig(BaseModel):
    """Global system configuration and cache"""
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    description = models.TextField(blank=True)
    
    # Cache common queries and calculations
    # Examples:
    # 'default_categories': {'income': ['salary', 'freelance'], 'expense': ['food', 'transport']}
    # 'plan_matrix': Pre-calculated plan comparison data
    # 'ai_models': Available AI models and their configurations
    # 'exchange_rates': Currency exchange rates cache
    
    class Meta:
        indexes = [
            models.Index(fields=['key']),
        ]
    
    def __str__(self):
        return self.key
    
    @classmethod
    def get_config(cls, key, default=None):
        """Get system configuration value"""
        try:
            config = cls.objects.get(key=key)
            return config.value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_config(cls, key, value, description=''):
        """Set system configuration value"""
        config, created = cls.objects.get_or_create(
            key=key,
            defaults={'value': value, 'description': description}
        )
        if not created:
            config.value = value
            config.description = description
            config.save()
        return config


# ================================
# SOCIAL AND NOTIFICATION MODELS
# ================================

class UserRelationship(BaseModel):
    """Manage relationships between users - family, friends, business partners"""
    
    RELATIONSHIP_TYPES = [
        ('family', 'Family Member'),
        ('spouse', 'Spouse/Partner'),
        ('friend', 'Friend'),
        ('business', 'Business Partner'),
        ('colleague', 'Colleague'),
        ('advisor', 'Financial Advisor'),
        ('accountant', 'Accountant'),
        ('other', 'Other'),
    ]
    
    RELATIONSHIP_STATUS = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('blocked', 'Blocked'),
        ('declined', 'Declined'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='relationships_initiated')
    related_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='relationships_received')
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES)
    status = models.CharField(max_length=20, choices=RELATIONSHIP_STATUS, default='pending')
    
    # Relationship configuration
    relationship_config = models.JSONField(default=dict)
    # Structure: {
    #   'permissions': {
    #       'view_transactions': true,
    #       'add_transactions': false,
    #       'view_investments': true,
    #       'manage_joint_accounts': true
    #   },
    #   'joint_accounts': ['account_uuid_1', 'account_uuid_2'],
    #   'shared_budgets': ['budget_uuid_1'],
    #   'notification_preferences': {
    #       'transaction_alerts': true,
    #       'goal_updates': true,
    #       'investment_alerts': false
    #   },
    #   'family_role': 'parent',  # parent, child, spouse, guardian
    #   'financial_responsibility': 50  # percentage for joint expenses
    # }
    
    # Privacy and access settings
    is_mutual = models.BooleanField(default=False)  # Both users accepted
    can_view_financial_data = models.BooleanField(default=False)
    can_add_transactions = models.BooleanField(default=False)
    can_manage_joint_accounts = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['user', 'related_user']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['related_user', 'status']),
            models.Index(fields=['relationship_type']),
            models.Index(fields=['is_mutual']),
        ]
    
    def __str__(self):
        return f"{self.user.username} -> {self.related_user.username} ({self.relationship_type})"
    
    def accept_relationship(self):
        """Accept a pending relationship"""
        if self.status == 'pending':
            self.status = 'accepted'
            self.is_mutual = True
            self.save()
            
            # Create reverse relationship
            reverse_rel, created = UserRelationship.objects.get_or_create(
                user=self.related_user,
                related_user=self.user,
                defaults={
                    'relationship_type': self.relationship_type,
                    'status': 'accepted',
                    'is_mutual': True,
                    'relationship_config': self.relationship_config.copy()
                }
            )
            
            # Send notification
            Notification.objects.create(
                user=self.user,
                notification_type='relationship',
                title='Relationship Accepted',
                message=f'{self.related_user.get_full_name() or self.related_user.username} accepted your connection request',
                data={'relationship_id': str(self.id)}
            )
            
            return True
        return False
    
    def get_joint_accounts(self):
        """Get shared accounts between users"""
        joint_account_ids = self.relationship_config.get('joint_accounts', [])
        return Entity.objects.filter(
            id__in=joint_account_ids,
            entity_type='account',
            is_active=True
        )


class SocialGroup(BaseModel):
    """Social groups for shared expenses, family budgets, business partnerships"""
    
    GROUP_TYPES = [
        ('family', 'Family'),
        ('friends', 'Friends'),
        ('roommates', 'Roommates'),
        ('business', 'Business'),
        ('trip', 'Trip/Event'),
        ('club', 'Club/Organization'),
        ('custom', 'Custom'),
    ]
    
    GROUP_PRIVACY = [
        ('public', 'Public'),
        ('private', 'Private'),
        ('invite_only', 'Invite Only'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    group_type = models.CharField(max_length=20, choices=GROUP_TYPES)
    privacy = models.CharField(max_length=20, choices=GROUP_PRIVACY, default='private')
    
    # Group owner and members
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField(User, through='GroupMembership', related_name='social_groups')
    
    # Group configuration
    group_config = models.JSONField(default=dict)
    # Structure: {
    #   'expense_splitting': {
    #       'default_method': 'equal',  # equal, percentage, amount, shares
    #       'auto_split_new_expenses': true,
    #       'require_approval_for_expenses': false
    #   },
    #   'permissions': {
    #       'members_can_add_expenses': true,
    #       'members_can_invite': false,
    #       'members_can_edit_group': false
    #   },
    #   'notifications': {
    #       'new_expense_notifications': true,
    #       'payment_reminders': true,
    #       'settlement_notifications': true
    #   },
    #   'currency': 'USD',
    #   'family_settings': {
    #       'allowance_system': true,
    #       'parental_controls': true,
    #       'spending_limits': {'child': 100.00}
    #   }
    # }
    
    # Group statistics (denormalized for performance)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_settled = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    member_count = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['group_type', 'is_active']),
            models.Index(fields=['privacy']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.group_type})"
    
    def add_member(self, user, role='member', permissions=None):
        """Add member to group"""
        membership, created = GroupMembership.objects.get_or_create(
            group=self,
            user=user,
            defaults={
                'role': role,
                'member_config': permissions or {}
            }
        )
        
        if created:
            self.member_count = self.members.count()
            self.save()
            
            # Notify all members about new member
            self.notify_members(
                f'{user.get_full_name() or user.username} joined the group',
                'member_joined',
                exclude_user=user
            )
        
        return membership
    
    def remove_member(self, user):
        """Remove member from group"""
        try:
            membership = GroupMembership.objects.get(group=self, user=user)
            membership.delete()
            
            self.member_count = self.members.count()
            self.save()
            
            # Notify remaining members
            self.notify_members(
                f'{user.get_full_name() or user.username} left the group',
                'member_left',
                exclude_user=user
            )
            return True
        except GroupMembership.DoesNotExist:
            return False
    
    def notify_members(self, message, notification_type='group_update', exclude_user=None, data=None):
        """Send notification to all group members"""
        members = self.members.all()
        if exclude_user:
            members = members.exclude(id=exclude_user.id)
        
        notifications = []
        for member in members:
            notifications.append(Notification(
                user=member,
                notification_type=notification_type,
                title=f'{self.name} - Update',
                message=message,
                data=data or {'group_id': str(self.id)}
            ))
        
        Notification.objects.bulk_create(notifications)
    
    def calculate_balances(self):
        """Calculate who owes what in the group"""
        # Get all group transactions
        group_transactions = Transaction.objects.filter(
            user__in=self.members.all(),
            transaction_type='group_expense',
            transaction_data__group_id=str(self.id),
            status='active'
        )
        
        balances = {}
        for member in self.members.all():
            balances[member.id] = {
                'user': member,
                'paid': Decimal('0'),
                'owes': Decimal('0'),
                'balance': Decimal('0')
            }
        
        for tx in group_transactions:
            payer_id = tx.user.id
            participants = tx.transaction_data.get('participants', [])
            
            # Add to what payer paid
            balances[payer_id]['paid'] += tx.amount
            
            # Calculate what each participant owes
            for participant in participants:
                user_id = participant.get('user_id')
                amount_owed = Decimal(str(participant.get('amount', 0)))
                if user_id in balances:
                    balances[user_id]['owes'] += amount_owed
        
        # Calculate net balances
        for user_id in balances:
            balance_data = balances[user_id]
            balance_data['balance'] = balance_data['paid'] - balance_data['owes']
        
        return balances


class GroupMembership(BaseModel):
    """Through model for group membership with roles and permissions"""
    
    MEMBER_ROLES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('child', 'Child (Family)'),
        ('guest', 'Guest'),
    ]
    
    group = models.ForeignKey(SocialGroup, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=MEMBER_ROLES, default='member')
    
    # Member-specific configuration
    member_config = models.JSONField(default=dict)
    # Structure: {
    #   'permissions': {
    #       'can_add_expenses': true,
    #       'can_edit_expenses': false,
    #       'can_invite_members': false,
    #       'can_view_all_transactions': true
    #   },
    #   'expense_defaults': {
    #       'default_share_percentage': 25.0,
    #       'spending_limit': 500.00
    #   },
    #   'notification_preferences': {
    #       'expense_notifications': true,
    #       'payment_reminders': true,
    #       'weekly_summary': false
    #   }
    # }
    
    # Status tracking
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['group', 'user']
        indexes = [
            models.Index(fields=['group', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role']),
        ]
    
    def can_perform_action(self, action):
        """Check if member can perform specific action"""
        permissions = self.member_config.get('permissions', {})
        
        # Owner can do everything
        if self.role == 'owner':
            return True
        
        # Admin has most permissions
        if self.role == 'admin':
            admin_permissions = ['can_add_expenses', 'can_edit_expenses', 'can_view_all_transactions']
            return action in admin_permissions or permissions.get(action, False)
        
        # Check specific permissions
        return permissions.get(action, False)


class Notification(BaseModel):
    """Universal notification system"""
    
    NOTIFICATION_TYPES = [
        ('transaction', 'Transaction Alert'),
        ('goal', 'Goal Update'),
        ('investment', 'Investment Alert'),
        ('group_expense', 'Group Expense'),
        ('payment_reminder', 'Payment Reminder'),
        ('relationship', 'Relationship Update'),
        ('group_update', 'Group Update'),
        ('system', 'System Notification'),
        ('ai_insight', 'AI Insight'),
        ('security', 'Security Alert'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='normal')
    
    # Notification content
    title = models.CharField(max_length=255)
    message = models.TextField()
    action_url = models.URLField(blank=True)  # URL for click action
    
    # Notification data and context
    data = models.JSONField(default=dict)
    # Structure varies by notification_type:
    # transaction: {'transaction_id': 'uuid', 'amount': 100.00, 'account': 'Checking'}
    # group_expense: {'group_id': 'uuid', 'expense_id': 'uuid', 'amount': 50.00, 'group_name': 'Friends'}
    # goal: {'goal_id': 'uuid', 'progress': 75.0, 'target': 1000.00}
    # investment: {'investment_id': 'uuid', 'symbol': 'AAPL', 'change': 5.2}
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Delivery tracking
    delivery_method = models.JSONField(default=list)  # ['in_app', 'email', 'push']
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, null=True, blank=True)
    related_transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True)
    related_group = models.ForeignKey(SocialGroup, on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
            models.Index(fields=['priority', 'is_read']),
            models.Index(fields=['related_group']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    def dismiss(self):
        """Dismiss notification"""
        self.is_dismissed = True
        self.save()
    
    @classmethod
    def create_transaction_notification(cls, user, transaction, message_template=None):
        """Create transaction-related notification"""
        message = message_template or f"New {transaction.transaction_type} transaction: {transaction.description}"
        
        return cls.objects.create(
            user=user,
            notification_type='transaction',
            title='Transaction Alert',
            message=message,
            data={
                'transaction_id': str(transaction.id),
                'amount': float(transaction.amount),
                'transaction_type': transaction.transaction_type,
                'account': transaction.primary_entity.name if transaction.primary_entity else None
            },
            related_transaction=transaction,
            related_entity=transaction.primary_entity
        )
    
    @classmethod
    def create_group_expense_notification(cls, users, group, expense_transaction, message):
        """Create group expense notifications for multiple users"""
        notifications = []
        for user in users:
            notifications.append(cls(
                user=user,
                notification_type='group_expense',
                title=f'{group.name} - New Expense',
                message=message,
                data={
                    'group_id': str(group.id),
                    'group_name': group.name,
                    'transaction_id': str(expense_transaction.id),
                    'amount': float(expense_transaction.amount),
                    'description': expense_transaction.description
                },
                related_transaction=expense_transaction,
                related_group=group
            ))
        
        return cls.objects.bulk_create(notifications)


# ================================
# ENHANCED MODELS WITH SOCIAL FEATURES  
# ================================

# Enhance existing models with social features

# Add to Transaction model
def create_group_expense(user, group, amount, description, participants, split_method='equal'):
    """Create a group expense transaction with automatic splitting"""
    
    # Calculate individual shares
    if split_method == 'equal':
        share_amount = amount / len(participants)
        participant_data = [
            {
                'user_id': p['user_id'],
                'user_name': p.get('user_name', ''),
                'amount': float(share_amount),
                'paid': p.get('user_id') == user.id
            }
            for p in participants
        ]
    else:
        # Custom amounts or percentages
        participant_data = participants
    
    # Create the transaction
    transaction = Transaction.objects.create(
        user=user,
        transaction_type='group_expense',
        amount=amount,
        description=description,
        date=timezone.now().date(),
        transaction_data={
            'group_id': str(group.id),
            'group_name': group.name,
            'split_method': split_method,
            'participants': participant_data,
            'creator_paid': True
        },
        status='active'
    )
    
    # Create notifications for all participants except creator
    other_members = [p for p in participants if p['user_id'] != user.id]
    if other_members:
        member_users = User.objects.filter(id__in=[p['user_id'] for p in other_members])
        Notification.create_group_expense_notification(
            users=member_users,
            group=group,
            expense_transaction=transaction,
            message=f"{user.get_full_name() or user.username} added a new expense: {description} (${amount})"
        )
    
    # Update group statistics
    group.total_expenses += amount
    group.save()
    
    return transaction

# Add to Entity model for joint accounts
def create_joint_account(primary_user, secondary_users, account_name, account_type='checking', initial_balance=0):
    """Create a joint account shared between multiple users"""
    
    # Create the account entity
    account = Entity.objects.create(
        user=primary_user,  # Primary owner
        entity_type='account',
        name=account_name,
        code=f"JOINT_{account_name.replace(' ', '_').upper()}",
        data={
            'type': account_type,
            'balance': float(initial_balance),
            'currency': 'USD',
            'is_joint': True,
            'primary_owner': primary_user.id,
            'joint_owners': [u.id for u in secondary_users],
            'permissions': {
                'all_can_view': True,
                'all_can_transact': True,
                'require_approval_over': 1000.00  # Require approval for transactions over $1000
            }
        },
        relationships={
            'joint_owners': [str(u.id) for u in secondary_users],
            'owner_type': 'joint'
        }
    )
    
    # Create relationships between users for this joint account
    for secondary_user in secondary_users:
        # Update existing relationships or create new ones
        relationship, created = UserRelationship.objects.get_or_create(
            user=primary_user,
            related_user=secondary_user,
            defaults={
                'relationship_type': 'family',  # Default to family
                'status': 'accepted',
                'is_mutual': True
            }
        )
        
        # Add joint account to relationship config
        joint_accounts = relationship.relationship_config.get('joint_accounts', [])
        if str(account.id) not in joint_accounts:
            joint_accounts.append(str(account.id))
            relationship.relationship_config['joint_accounts'] = joint_accounts
            relationship.save()
        
        # Create reverse relationship
        reverse_relationship, created = UserRelationship.objects.get_or_create(
            user=secondary_user,
            related_user=primary_user,
            defaults={
                'relationship_type': 'family',
                'status': 'accepted',
                'is_mutual': True,
                'relationship_config': relationship.relationship_config.copy()
            }
        )
        
        # Notify secondary users
        Notification.objects.create(
            user=secondary_user,
            notification_type='relationship',
            title='Joint Account Added',
            message=f'{primary_user.get_full_name() or primary_user.username} added you to joint account: {account_name}',
            data={
                'account_id': str(account.id),
                'account_name': account_name,
                'primary_owner': primary_user.username
            },
            related_entity=account
        )
    
    return account

def add_joint_transaction(account, user, amount, description, transaction_type='expense', notify_joint_owners=True):
    """Add transaction to joint account with notifications to all owners"""
    
    if not account.get_data_value('is_joint', False):
        raise ValueError("This is not a joint account")
    
    # Check if user has permission
    joint_owners = account.get_data_value('joint_owners', [])
    primary_owner = account.get_data_value('primary_owner')
    
    if user.id not in joint_owners and user.id != primary_owner:
        raise PermissionError("User does not have access to this joint account")
    
    # Check approval requirements for large transactions
    require_approval_over = account.get_data_value('permissions', {}).get('require_approval_over', float('inf'))
    needs_approval = abs(amount) > require_approval_over
    
    # Create transaction
    transaction = Transaction.objects.create(
        user=user,
        transaction_type=transaction_type,
        amount=amount,
        description=description,
        date=timezone.now().date(),
        primary_entity=account,
        transaction_data={
            'joint_account': True,
            'initiated_by': user.id,
            'needs_approval': needs_approval,
            'approved_by': [] if needs_approval else [user.id],
            'approval_status': 'pending' if needs_approval else 'approved'
        },
        status='pending' if needs_approval else 'active'
    )
    
    # Update account balance if approved
    if not needs_approval:
        current_balance = Decimal(str(account.get_data_value('balance', 0)))
        if transaction_type == 'expense':
            new_balance = current_balance - amount
        else:
            new_balance = current_balance + amount
        account.set_data_value('balance', float(new_balance))
    
    # Notify joint owners
    if notify_joint_owners:
        all_owner_ids = joint_owners + [primary_owner]
        owner_users = User.objects.filter(id__in=all_owner_ids).exclude(id=user.id)
        
        message = f"{user.get_full_name() or user.username} added a transaction to {account.name}: {description} (${amount})"
        if needs_approval:
            message += " - Approval required"
        
        notifications = []
        for owner in owner_users:
            notifications.append(Notification(
                user=owner,
                notification_type='transaction',
                title=f'Joint Account Transaction - {account.name}',
                message=message,
                data={
                    'transaction_id': str(transaction.id),
                    'account_id': str(account.id),
                    'account_name': account.name,
                    'amount': float(amount),
                    'needs_approval': needs_approval,
                    'initiated_by': user.username
                },
                related_transaction=transaction,
                related_entity=account,
                priority='high' if needs_approval else 'normal'
            ))
        
        Notification.objects.bulk_create(notifications)
    
    return transaction

def approve_joint_transaction(transaction, approving_user):
    """Approve a pending joint transaction"""
    
    if transaction.status != 'pending':
        return False
    
    transaction_data = transaction.transaction_data
    if not transaction_data.get('needs_approval', False):
        return False
    
    # Check if user can approve
    account = transaction.primary_entity
    joint_owners = account.get_data_value('joint_owners', [])
    primary_owner = account.get_data_value('primary_owner')
    
    if approving_user.id not in joint_owners and approving_user.id != primary_owner:
        return False
    
    # Add approval
    approved_by = transaction_data.get('approved_by', [])
    if approving_user.id not in approved_by:
        approved_by.append(approving_user.id)
        transaction_data['approved_by'] = approved_by
        
        # Check if we have enough approvals (for now, just need one other approval)
        initiated_by = transaction_data.get('initiated_by')
        other_approvals = [uid for uid in approved_by if uid != initiated_by]
        
        if len(other_approvals) >= 1:  # At least one other person approved
            transaction.status = 'active'
            transaction_data['approval_status'] = 'approved'
            
            # Update account balance
            current_balance = Decimal(str(account.get_data_value('balance', 0)))
            if transaction.transaction_type == 'expense':
                new_balance = current_balance - transaction.amount
            else:
                new_balance = current_balance + transaction.amount
            account.set_data_value('balance', float(new_balance))
            
            # Notify all owners
            all_owner_ids = joint_owners + [primary_owner]
            owner_users = User.objects.filter(id__in=all_owner_ids)
            
            notifications = []
            for owner in owner_users:
                notifications.append(Notification(
                    user=owner,
                    notification_type='transaction',
                    title=f'Transaction Approved - {account.name}',
                    message=f'Transaction approved: {transaction.description} (${transaction.amount})',
                    data={
                        'transaction_id': str(transaction.id),
                        'account_id': str(account.id),
                        'approved_by': approving_user.username
                    },
                    related_transaction=transaction,
                    related_entity=account
                ))
            
            Notification.objects.bulk_create(notifications)
        
        transaction.transaction_data = transaction_data
        transaction.save()
        
        return True
    
    return False

# Add family-specific features
def create_family_group(parent_user, family_name, children=None, spouse=None):
    """Create a family group with parental controls"""
    
    # Create family group
    family_group = SocialGroup.objects.create(
        name=family_name,
        description=f"Family group for {family_name}",
        group_type='family',
        owner=parent_user,
        group_config={
            'expense_splitting': {
                'default_method': 'custom',
                'auto_split_new_expenses': False,
                'require_approval_for_expenses': True
            },
            'permissions': {
                'members_can_add_expenses': False,  # Only parents can add expenses initially
                'members_can_invite': False,
                'members_can_edit_group': False
            },
            'family_settings': {
                'allowance_system': True,
                'parental_controls': True,
                'spending_limits': {},
                'allowance_schedule': 'weekly',
                'chore_system': True
            },
            'notifications': {
                'new_expense_notifications': True,
                'allowance_notifications': True,
                'spending_limit_alerts': True
            }
        }
    )
    
    # Add parent as owner
    GroupMembership.objects.create(
        group=family_group,
        user=parent_user,
        role='owner',
        member_config={
            'permissions': {
                'can_add_expenses': True,
                'can_edit_expenses': True,
                'can_invite_members': True,
                'can_view_all_transactions': True,
                'can_set_allowances': True,
                'can_set_spending_limits': True
            },
            'family_role': 'parent'
        }
    )
    
    # Add spouse if provided
    if spouse:
        family_group.add_member(
            user=spouse,
            role='admin',
            permissions={
                'permissions': {
                    'can_add_expenses': True,
                    'can_edit_expenses': True,
                    'can_invite_members': True,
                    'can_view_all_transactions': True,
                    'can_set_allowances': True,
                    'can_set_spending_limits': True
                },
                'family_role': 'parent'
            }
        )
        
        # Create spouse relationship
        UserRelationship.objects.get_or_create(
            user=parent_user,
            related_user=spouse,
            defaults={
                'relationship_type': 'spouse',
                'status': 'accepted',
                'is_mutual': True,
                'can_view_financial_data': True,
                'can_add_transactions': True,
                'can_manage_joint_accounts': True,
                'relationship_config': {
                    'family_group_id': str(family_group.id),
                    'financial_responsibility': 50
                }
            }
        )
    
    # Add children if provided
    if children:
        for child in children:
            family_group.add_member(
                user=child,
                role='child',
                permissions={
                    'permissions': {
                        'can_add_expenses': False,
                        'can_view_all_transactions': False,  # Can only see their own
                        'can_request_allowance': True
                    },
                    'expense_defaults': {
                        'spending_limit': 50.00  # Default $50 spending limit
                    },
                    'allowance_settings': {
                        'weekly_allowance': 20.00,
                        'chore_bonus': 5.00
                    },
                    'family_role': 'child'
                }
            )
            
            # Create parent-child relationship
            UserRelationship.objects.get_or_create(
                user=parent_user,
                related_user=child,
                defaults={
                    'relationship_type': 'family',
                    'status': 'accepted',
                    'is_mutual': True,
                    'can_view_financial_data': True,  # Parent can see child's transactions
                    'relationship_config': {
                        'family_group_id': str(family_group.id),
                        'family_role': 'child',
                        'parental_controls': True
                    }
                }
            )
    
    return family_group

# ================================
# HELPER METHODS AND PROPERTIES  
# ================================

# Add these methods to User model via monkey patching
def get_user_profile(self):
    """Get or create user profile"""
    profile, created = UserProfile.objects.get_or_create(user=self)
    return profile

def get_user_entities(self, entity_type=None):
    """Get user entities by type"""
    queryset = Entity.objects.filter(user=self, is_active=True)
    if entity_type:
        queryset = queryset.filter(entity_type=entity_type)
    return queryset

def get_user_accounts(self):
    """Get user accounts including joint accounts"""
    # Get own accounts
    own_accounts = self.get_user_entities('account')
    
    # Get joint accounts through relationships
    relationships = UserRelationship.objects.filter(
        user=self, 
        status='accepted',
        can_manage_joint_accounts=True
    )
    
    joint_account_ids = []
    for rel in relationships:
        joint_accounts = rel.relationship_config.get('joint_accounts', [])
        joint_account_ids.extend(joint_accounts)
    
    joint_accounts = Entity.objects.filter(
        id__in=joint_account_ids,
        entity_type='account',
        is_active=True
    )
    
    # Combine and return unique accounts
    all_accounts = own_accounts.union(joint_accounts)
    return all_accounts

def get_user_investments(self):
    """Get user investments"""
    return self.get_user_entities('investment')

def get_user_groups(self):
    """Get social groups user belongs to"""
    return SocialGroup.objects.filter(members=self, is_active=True)

def get_family_groups(self):
    """Get family groups user belongs to"""
    return self.get_user_groups().filter(group_type='family')

def get_user_relationships(self, relationship_type=None):
    """Get user relationships"""
    queryset = UserRelationship.objects.filter(
        user=self, 
        status='accepted'
    )
    if relationship_type:
        queryset = queryset.filter(relationship_type=relationship_type)
    return queryset

def get_unread_notifications(self):
    """Get unread notifications"""
    return Notification.objects.filter(user=self, is_read=False, is_dismissed=False)

def get_notifications_count(self):
    """Get count of unread notifications by type"""
    notifications = self.get_unread_notifications()
    counts = {}
    for notification_type, _ in Notification.NOTIFICATION_TYPES:
        counts[notification_type] = notifications.filter(notification_type=notification_type).count()
    counts['total'] = notifications.count()
    return counts

def can_access_account(self, account):
    """Check if user can access an account (own or joint)"""
    # Own account
    if account.user == self:
        return True
    
    # Joint account
    if account.get_data_value('is_joint', False):
        joint_owners = account.get_data_value('joint_owners', [])
        primary_owner = account.get_data_value('primary_owner')
        return self.id in joint_owners or self.id == primary_owner
    
    return False

def can_access_group(self, group):
    """Check if user can access a group"""
    return GroupMembership.objects.filter(group=group, user=self, is_active=True).exists()

# Monkey patch User model
User.get_profile = get_user_profile
User.get_entities = get_user_entities
User.get_accounts = get_user_accounts
User.get_investments = get_user_investments
User.get_groups = get_user_groups
User.get_family_groups = get_family_groups
User.get_relationships = get_user_relationships
User.get_unread_notifications = get_unread_notifications
User.get_notifications_count = get_notifications_count
User.can_access_account = can_access_account
User.can_access_group = can_access_group

# Add utility functions as standalone
Transaction.create_group_expense = staticmethod(create_group_expense)
Entity.create_joint_account = staticmethod(create_joint_account)
Entity.add_joint_transaction = staticmethod(add_joint_transaction)
Transaction.approve_joint_transaction = staticmethod(approve_joint_transaction)
SocialGroup.create_family_group = staticmethod(create_family_group)