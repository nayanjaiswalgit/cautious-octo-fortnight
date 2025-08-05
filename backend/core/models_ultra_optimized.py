"""
ULTRA-OPTIMIZED Django models with maximum consolidation
Reduces ALL models to just 3 super-models using pure algorithmic data storage
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
# ULTRA-CONSOLIDATED MODELS (3 TOTAL)
# ================================

class DataNode(models.Model):
    """
    UNIVERSAL DATA STORAGE - Replaces ALL entity-based models
    Handles: Users, Profiles, Accounts, Categories, Tags, Contacts, Goals, 
    Investments, Plans, Groups, Relationships, Documents, System Config, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Universal identifiers
    node_type = models.CharField(max_length=50, db_index=True)  # user_profile, entity, plan, group, etc.
    node_subtype = models.CharField(max_length=50, db_index=True, blank=True)  # account, contact, etc.
    code = models.CharField(max_length=100, db_index=True, blank=True)  # Unique identifier within type
    name = models.CharField(max_length=255, db_index=True)
    
    # Ownership and relationships
    owner_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    parent_node = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    related_nodes = models.JSONField(default=list, blank=True)  # List of related node IDs
    
    # Universal data storage using pure JSON
    data_core = models.JSONField(default=dict, blank=True)      # Core data (balance, price, settings, etc.)
    data_config = models.JSONField(default=dict, blank=True)    # Configuration data
    data_state = models.JSONField(default=dict, blank=True)     # State/status data
    data_extended = models.JSONField(default=dict, blank=True)  # Extended/custom data
    
    # Universal flags and status
    is_active = models.BooleanField(default=True, db_index=True)
    priority = models.IntegerField(default=0, db_index=True)
    status = models.CharField(max_length=50, default='active', db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['node_type', 'is_active']),
            models.Index(fields=['owner_user', 'node_type']),
            models.Index(fields=['node_type', 'node_subtype']),
            models.Index(fields=['parent_node', 'is_active']),
            models.Index(fields=['code']),
            models.Index(fields=['name']),
        ]
        unique_together = [('owner_user', 'node_type', 'code')]
    
    def __str__(self):
        return f"{self.node_type}: {self.name}"
    
    @property
    def typed_data(self):
        """Get data formatted based on node type"""
        if self.node_type == 'user_profile':
            return {
                'subscription_status': self.data_core.get('subscription_status', 'free'),
                'ai_credits': self.data_core.get('ai_credits', 0),
                'monthly_cost': self.data_core.get('monthly_cost', 0),
                'settings': self.data_config,
            }
        elif self.node_type == 'entity' and self.node_subtype == 'account':
            return {
                'balance': Decimal(str(self.data_core.get('balance', '0.00'))),
                'account_type': self.data_core.get('account_type', 'checking'),
                'currency': self.data_core.get('currency', 'USD'),
            }
        elif self.node_type == 'entity' and self.node_subtype == 'contact':
            return {
                'email': self.data_core.get('email', ''),
                'phone': self.data_core.get('phone', ''),
                'address': self.data_extended.get('address', ''),
            }
        # Add more type-specific formatting as needed
        return {**self.data_core, **self.data_config, **self.data_state}


class EventFlow(models.Model):
    """
    UNIVERSAL EVENT/TRANSACTION STORAGE - Replaces ALL transaction/activity-based models
    Handles: Transactions, Activities, Notifications, Logs, Events, Messages, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Universal event classification
    flow_type = models.CharField(max_length=50, db_index=True)     # transaction, activity, notification, etc.
    flow_subtype = models.CharField(max_length=50, db_index=True, blank=True)  # income, expense, login, etc.
    action = models.CharField(max_length=100, db_index=True)       # create, update, transfer, notify, etc.
    
    # Ownership and relationships
    owner_user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    source_node = models.ForeignKey(DataNode, on_delete=models.CASCADE, null=True, blank=True, 
                                   related_name='source_flows', db_index=True)
    target_node = models.ForeignKey(DataNode, on_delete=models.CASCADE, null=True, blank=True, 
                                   related_name='target_flows', db_index=True)
    related_flows = models.JSONField(default=list, blank=True)     # Related event IDs
    
    # Universal value and data
    amount = models.DecimalField(max_digits=15, decimal_places=4, default=0, db_index=True)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    # Universal data storage
    flow_data = models.JSONField(default=dict, blank=True)         # Main event data
    flow_context = models.JSONField(default=dict, blank=True)      # Context data (user_agent, ip, etc.)
    flow_result = models.JSONField(default=dict, blank=True)       # Result/response data
    
    # Universal status and flags
    status = models.CharField(max_length=50, default='pending', db_index=True)
    priority = models.CharField(max_length=20, default='medium', db_index=True)
    is_processed = models.BooleanField(default=False, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)    # For notifications
    
    # Timestamps and scheduling
    event_date = models.DateField(db_index=True, default=timezone.now)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['owner_user', 'flow_type']),
            models.Index(fields=['flow_type', 'status']),
            models.Index(fields=['owner_user', 'event_date']),
            models.Index(fields=['source_node', 'flow_type']),
            models.Index(fields=['target_node', 'flow_type']),
            models.Index(fields=['flow_type', 'is_processed']),
            models.Index(fields=['priority', 'is_read']),
            models.Index(fields=['scheduled_at']),
        ]
    
    def __str__(self):
        return f"{self.flow_type}: {self.title or self.description[:50]}"
    
    @property
    def typed_data(self):
        """Get data formatted based on flow type"""
        if self.flow_type == 'transaction':
            return {
                'transaction_type': self.flow_subtype,
                'amount': self.amount,
                'account': self.source_node.name if self.source_node else None,
                'category': self.flow_data.get('category'),
                'tags': self.flow_data.get('tags', []),
                'merchant': self.flow_data.get('merchant'),
            }
        elif self.flow_type == 'notification':
            return {
                'notification_type': self.flow_subtype,
                'title': self.title,
                'message': self.description,
                'is_read': self.is_read,
                'action_url': self.flow_data.get('action_url'),
            }
        elif self.flow_type == 'activity':
            return {
                'activity_type': self.flow_subtype,
                'action': self.action,
                'ip_address': self.flow_context.get('ip_address'),
                'user_agent': self.flow_context.get('user_agent'),
            }
        return {**self.flow_data, **self.flow_context, **self.flow_result}


class SystemRegistry(models.Model):
    """
    UNIVERSAL SYSTEM STORAGE - Replaces ALL system/configuration models
    Handles: System configs, migrations, logs, schedules, templates, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Universal system classification
    registry_type = models.CharField(max_length=50, db_index=True)    # config, template, schedule, etc.
    registry_key = models.CharField(max_length=200, db_index=True)    # Unique key within type
    registry_scope = models.CharField(max_length=50, default='global', db_index=True)  # global, user, app
    
    # Optional user association for user-scoped configs
    scope_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    
    # Universal data storage
    registry_value = models.JSONField(default=dict, blank=True)       # Main configuration value
    registry_meta = models.JSONField(default=dict, blank=True)        # Metadata about the config
    registry_schema = models.JSONField(default=dict, blank=True)      # Schema/validation rules
    
    # Universal properties
    name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50, default='1.0', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_encrypted = models.BooleanField(default=False)
    priority = models.IntegerField(default=0, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['registry_type', 'is_active']),
            models.Index(fields=['registry_scope', 'scope_user']),
            models.Index(fields=['registry_type', 'registry_key']),
            models.Index(fields=['expires_at']),
        ]
        unique_together = [('registry_type', 'registry_key', 'registry_scope', 'scope_user')]
    
    def __str__(self):
        return f"{self.registry_type}: {self.registry_key}"
    
    def get_value(self):
        """Get decrypted value if encrypted"""
        if self.is_encrypted and hasattr(settings, 'AI_ENCRYPTION_KEY'):
            try:
                fernet = Fernet(settings.AI_ENCRYPTION_KEY.encode())
                decrypted = fernet.decrypt(self.registry_value.encode())
                return json.loads(decrypted.decode())
            except:
                return self.registry_value
        return self.registry_value
    
    def set_value(self, value, encrypt=False):
        """Set value with optional encryption"""
        if encrypt and hasattr(settings, 'AI_ENCRYPTION_KEY'):
            try:
                fernet = Fernet(settings.AI_ENCRYPTION_KEY.encode())
                encrypted = fernet.encrypt(json.dumps(value).encode())
                self.registry_value = encrypted.decode()
                self.is_encrypted = True
            except:
                self.registry_value = value
        else:
            self.registry_value = value
            self.is_encrypted = False


# ================================
# MONKEY PATCH USER MODEL FOR ULTRA OPTIMIZATION
# ================================

def get_profile(self):
    """Get or create user profile as DataNode"""
    profile, created = DataNode.objects.get_or_create(
        owner_user=self,
        node_type='user_profile',
        code=f'profile_{self.id}',
        defaults={
            'name': f'{self.get_full_name() or self.username} Profile',
            'data_core': {
                'subscription_status': 'free',
                'ai_credits': 10,
                'monthly_cost': 0,
            }
        }
    )
    return profile

def get_entities(self, entity_type=None):
    """Get user entities (accounts, contacts, etc.)"""
    queryset = DataNode.objects.filter(owner_user=self, node_type='entity')
    if entity_type:
        queryset = queryset.filter(node_subtype=entity_type)
    return queryset

def get_transactions(self, limit=None):
    """Get user transactions"""
    queryset = EventFlow.objects.filter(owner_user=self, flow_type='transaction').order_by('-event_date')
    if limit:
        queryset = queryset[:limit]
    return queryset

def get_notifications(self, unread_only=False):
    """Get user notifications"""
    queryset = EventFlow.objects.filter(owner_user=self, flow_type='notification').order_by('-created_at')
    if unread_only:
        queryset = queryset.filter(is_read=False)
    return queryset

# Add methods to User model
User.add_to_class('get_profile', get_profile)
User.add_to_class('get_entities', get_entities)
User.add_to_class('get_transactions', get_transactions)
User.add_to_class('get_notifications', get_notifications)


# ================================
# UTILITY FUNCTIONS FOR DATA MIGRATION
# ================================

def migrate_old_data_to_ultra_optimized():
    """
    Utility function to migrate from 8-model architecture to 3-model architecture
    This would be called during the optimization process
    """
    pass  # Implementation would go here


# ================================
# SUMMARY OF ULTRA OPTIMIZATION
# ================================
"""
BEFORE: 33+ individual models
AFTER FIRST OPTIMIZATION: 8 models (UserProfile, Entity, Transaction, Plan, Activity, Document, SystemConfig, + Social models)
AFTER ULTRA OPTIMIZATION: 3 SUPER-MODELS

1. DataNode - Handles ALL entity-like data:
   - User profiles, accounts, contacts, categories
   - Tags, goals, investments, plans
   - Social groups, relationships, documents
   - System configurations, templates

2. EventFlow - Handles ALL event/transaction-like data:
   - Financial transactions, activities
   - Notifications, messages, logs
   - Recurring events, scheduled tasks
   - State changes, user actions

3. SystemRegistry - Handles ALL system/configuration data:
   - Application settings, user preferences
   - Migration data, version info
   - Scheduled tasks, templates
   - Global configurations, secrets

BENEFITS:
- Maximum storage efficiency through JSON fields
- Minimal database tables (3 vs 33+)
- Ultra-flexible schema evolution
- Simplified queries and relationships
- Easier maintenance and scaling
- Algorithmic data storage patterns
"""