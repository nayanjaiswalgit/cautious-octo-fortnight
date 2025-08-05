from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    UserProfile, Entity, Transaction, Plan, Activity, Document, SystemConfig,
    UserRelationship, SocialGroup, GroupMembership, Notification
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'current_plan', 'subscription_status', 'ai_credits_remaining',
            'total_monthly_cost', 'config', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EntitySerializer(serializers.ModelSerializer):
    """Universal serializer for all entity types (accounts, contacts, categories, tags, goals, investments)"""
    
    class Meta:
        model = Entity
        fields = [
            'id', 'entity_type', 'name', 'code', 'is_active', 'data', 
            'relationships', 'tags', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def to_representation(self, instance):
        """Customize representation based on entity type"""
        data = super().to_representation(instance)
        
        # Add type-specific fields from data JSON
        if instance.entity_type == 'account':
            data.update({
                'balance': instance.data.get('balance', '0.00'),
                'account_type': instance.data.get('account_type', 'checking'),
                'currency': instance.data.get('currency', 'USD'),
            })
        elif instance.entity_type == 'contact':
            data.update({
                'email': instance.data.get('email', ''),
                'phone': instance.data.get('phone', ''),
                'address': instance.data.get('address', ''),
            })
        elif instance.entity_type == 'category':
            data.update({
                'category_type': instance.data.get('category_type', 'expense'),
                'color': instance.data.get('color', '#000000'),
                'parent_id': instance.data.get('parent_id'),
            })
        elif instance.entity_type == 'investment':
            data.update({
                'symbol': instance.data.get('symbol', ''),
                'current_price': instance.data.get('current_price', '0.00'),
                'quantity': instance.data.get('quantity', '0'),
                'investment_type': instance.data.get('investment_type', 'stock'),
            })
        elif instance.entity_type == 'goal':
            data.update({
                'target_amount': instance.data.get('target_amount', '0.00'),
                'current_amount': instance.data.get('current_amount', '0.00'),
                'target_date': instance.data.get('target_date'),
                'goal_type': instance.data.get('goal_type', 'savings'),
            })
        
        return data


class TransactionSerializer(serializers.ModelSerializer):
    primary_entity_name = serializers.CharField(source='primary_entity.name', read_only=True)
    secondary_entity_name = serializers.CharField(source='secondary_entity.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_type', 'amount', 'description', 'date', 'status',
            'primary_entity', 'primary_entity_name', 'secondary_entity', 'secondary_entity_name',
            'transaction_data', 'tags', 'categories', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'code', 'plan_type', 'price', 'billing_cycle',
            'is_active', 'is_featured', 'config', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            'id', 'activity_type', 'action', 'related_entity', 'related_transaction',
            'activity_data', 'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            'id', 'document_type', 'title', 'description', 'file_path', 'file_size',
            'file_type', 'ai_processed', 'ai_confidence', 'ai_extracted_data',
            'document_data', 'related_entities', 'related_transactions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRelationshipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    related_user_name = serializers.CharField(source='related_user.username', read_only=True)
    
    class Meta:
        model = UserRelationship
        fields = [
            'id', 'user', 'user_name', 'related_user', 'related_user_name',
            'relationship_type', 'status', 'is_mutual', 'can_view_financial_data',
            'can_add_transactions', 'can_manage_joint_accounts', 'relationship_config',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupMembership
        fields = [
            'id', 'group', 'group_name', 'user', 'user_name', 'role', 'is_active',
            'joined_at', 'last_activity', 'member_config', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'joined_at', 'last_activity', 'created_at', 'updated_at']


class SocialGroupSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    members = GroupMembershipSerializer(source='groupmembership_set', many=True, read_only=True)
    
    class Meta:
        model = SocialGroup
        fields = [
            'id', 'name', 'description', 'group_type', 'privacy', 'owner', 'owner_name',
            'member_count', 'total_expenses', 'total_settled', 'is_active',
            'group_config', 'members', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'member_count', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    related_entity_name = serializers.CharField(source='related_entity.name', read_only=True)
    related_group_name = serializers.CharField(source='related_group.name', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority', 'is_read',
            'is_dismissed', 'read_at', 'delivered_at', 'action_url', 'related_entity',
            'related_entity_name', 'related_transaction', 'related_group', 'related_group_name',
            'data', 'delivery_method', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'read_at', 'delivered_at', 'created_at', 'updated_at']


# Legacy compatibility serializers for backward compatibility
class AccountSerializer(EntitySerializer):
    """Legacy account serializer - maps to Entity with entity_type='account'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'account'
        return super().create(validated_data)


class CategorySerializer(EntitySerializer):
    """Legacy category serializer - maps to Entity with entity_type='category'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'category'
        return super().create(validated_data)


class TagSerializer(EntitySerializer):
    """Legacy tag serializer - maps to Entity with entity_type='tag'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'tag'
        return super().create(validated_data)


class ContactSerializer(EntitySerializer):
    """Legacy contact serializer - maps to Entity with entity_type='contact'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'contact'
        return super().create(validated_data)


class GoalSerializer(EntitySerializer):
    """Legacy goal serializer - maps to Entity with entity_type='goal'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'goal'
        return super().create(validated_data)


class InvestmentSerializer(EntitySerializer):
    """Legacy investment serializer - maps to Entity with entity_type='investment'"""
    
    def create(self, validated_data):
        validated_data['entity_type'] = 'investment'
        return super().create(validated_data)


# Summary Serializers
class TransactionSummarySerializer(serializers.Serializer):
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    transaction_count = serializers.IntegerField()
    recent_transactions = TransactionSerializer(many=True)