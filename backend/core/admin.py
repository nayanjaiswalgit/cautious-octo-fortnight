from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    UserProfile, Entity, Transaction, Plan, Activity, Document, SystemConfig,
    UserRelationship, SocialGroup, GroupMembership, Notification
)

User = get_user_model()


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'current_plan', 'subscription_status', 'ai_credits_remaining', 'total_monthly_cost']
    list_filter = ['subscription_status', 'current_plan', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Subscription', {
            'fields': ('current_plan', 'subscription_status', 'total_monthly_cost')
        }),
        ('Usage', {
            'fields': ('ai_credits_remaining',)
        }),
        ('Configuration', {
            'fields': ('config',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ['name', 'entity_type', 'user', 'code', 'is_active', 'created_at']
    list_filter = ['entity_type', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'entity_type', 'name', 'code', 'is_active')
        }),
        ('Data', {
            'fields': ('data',),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('relationships',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'user', 'transaction_type', 'amount', 'date', 'status', 'primary_entity']
    list_filter = ['transaction_type', 'status', 'date', 'created_at']
    search_fields = ['description', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'transaction_type', 'status', 'amount', 'description', 'date')
        }),
        ('Entities', {
            'fields': ('primary_entity', 'secondary_entity')
        }),
        ('Data', {
            'fields': ('transaction_data', 'tags', 'categories'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'primary_entity', 'secondary_entity')


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'plan_type', 'price', 'billing_cycle', 'is_active', 'is_featured']
    list_filter = ['plan_type', 'billing_cycle', 'is_active', 'is_featured']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'code', 'plan_type', 'price', 'billing_cycle')
        }),
        ('Status', {
            'fields': ('is_active', 'is_featured')
        }),
        ('Configuration', {
            'fields': ('config',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'action', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['user__username', 'action']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'activity_type', 'action')
        }),
        ('Related Objects', {
            'fields': ('related_entity', 'related_transaction'),
            'classes': ('collapse',)
        }),
        ('Data', {
            'fields': ('activity_data',),
            'classes': ('collapse',)
        }),
        ('Request Context', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'document_type', 'user', 'file_size', 'ai_processed', 'created_at']
    list_filter = ['document_type', 'ai_processed', 'created_at']
    search_fields = ['title', 'description', 'user__username']
    readonly_fields = ['created_at', 'updated_at', 'file_size']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'document_type', 'title', 'description')
        }),
        ('File', {
            'fields': ('file_path', 'file_size', 'file_type')
        }),
        ('AI Processing', {
            'fields': ('ai_processed', 'ai_confidence', 'ai_extracted_data'),
            'classes': ('collapse',)
        }),
        ('Data', {
            'fields': ('document_data', 'related_entities', 'related_transactions'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'description', 'updated_at']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Configuration', {
            'fields': ('key', 'description', 'value')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserRelationship)
class UserRelationshipAdmin(admin.ModelAdmin):
    list_display = ['user', 'related_user', 'relationship_type', 'status', 'is_mutual']
    list_filter = ['relationship_type', 'status', 'is_mutual', 'created_at']
    search_fields = ['user__username', 'related_user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Users', {
            'fields': ('user', 'related_user')
        }),
        ('Relationship', {
            'fields': ('relationship_type', 'status', 'is_mutual')
        }),
        ('Permissions', {
            'fields': ('can_view_financial_data', 'can_add_transactions', 'can_manage_joint_accounts')
        }),
        ('Configuration', {
            'fields': ('relationship_config',),
            'classes': ('collapse',)
        }),
    )


@admin.register(SocialGroup)
class SocialGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'group_type', 'owner', 'member_count', 'privacy', 'is_active']
    list_filter = ['group_type', 'privacy', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'owner__username']
    readonly_fields = ['created_at', 'updated_at', 'member_count']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'group_type', 'privacy', 'owner')
        }),
        ('Statistics', {
            'fields': ('member_count', 'total_expenses', 'total_settled')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Configuration', {
            'fields': ('group_config',),
            'classes': ('collapse',)
        }),
    )


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['group', 'user', 'role', 'joined_at', 'is_active']
    list_filter = ['role', 'is_active', 'joined_at']
    search_fields = ['group__name', 'user__username']
    readonly_fields = ['created_at', 'updated_at', 'joined_at', 'last_activity']
    
    fieldsets = (
        ('Membership', {
            'fields': ('group', 'user', 'role', 'is_active')
        }),
        ('Activity', {
            'fields': ('joined_at', 'last_activity')
        }),
        ('Configuration', {
            'fields': ('member_config',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'priority', 'is_read', 'created_at']
    list_filter = ['notification_type', 'priority', 'is_read', 'is_dismissed', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    readonly_fields = ['created_at', 'updated_at', 'read_at', 'delivered_at']
    
    fieldsets = (
        ('Recipient', {
            'fields': ('user',)
        }),
        ('Content', {
            'fields': ('notification_type', 'priority', 'title', 'message', 'action_url')
        }),
        ('Status', {
            'fields': ('is_read', 'is_dismissed', 'read_at', 'delivered_at')
        }),
        ('Related Objects', {
            'fields': ('related_entity', 'related_transaction', 'related_group'),
            'classes': ('collapse',)
        }),
        ('Data', {
            'fields': ('data', 'delivery_method'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = "Mark selected notifications as read"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f'{updated} notifications marked as unread.')
    mark_as_unread.short_description = "Mark selected notifications as unread"