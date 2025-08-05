"""
Ultra optimization command - Consolidates ALL models into 3 super-models
"""

import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Ultra-optimize models - consolidate all models into 3 super-models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to proceed with ultra optimization',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This will consolidate ALL models into 3 super-models.\n'
                    'This is an irreversible operation that will:\n'
                    '1. Replace current models with 3 super-models\n'
                    '2. Use pure algorithmic data storage\n'
                    '3. Remove all backward compatibility\n'
                    '\nUse --confirm to proceed'
                )
            )
            return

        self.stdout.write('Starting ultra optimization...')

        # Step 1: Backup current models
        models_path = os.path.join(settings.BASE_DIR, 'core', 'models.py')
        backup_path = os.path.join(settings.BASE_DIR, 'core', 'models_8_optimized_backup.py')
        
        self.stdout.write('Creating backup of current models...')
        shutil.copy2(models_path, backup_path)
        
        # Step 2: Replace with ultra-optimized models
        ultra_models_path = os.path.join(settings.BASE_DIR, 'core', 'models_ultra_optimized.py')
        
        self.stdout.write('Replacing models with ultra-optimized version...')
        shutil.copy2(ultra_models_path, models_path)
        
        self.stdout.write(
            self.style.SUCCESS(
                'Ultra optimization complete!\n'
                '\nMODEL CONSOLIDATION SUMMARY:\n'
                '├── BEFORE: 33+ individual models\n'
                '├── PREVIOUS OPTIMIZATION: 8 models\n'
                '└── ULTRA OPTIMIZATION: 3 SUPER-MODELS\n'
                '\nNEW ARCHITECTURE:\n'
                '├── DataNode: All entity-like data (users, accounts, contacts, etc.)\n'
                '├── EventFlow: All event/transaction data (transactions, notifications, etc.)\n'
                '└── SystemRegistry: All system/config data (settings, templates, etc.)\n'
                '\nBENEFITS:\n'
                '├── Maximum storage efficiency through JSON fields\n'
                '├── Ultra-flexible schema evolution\n'
                '├── Simplified database structure (3 tables vs 33+)\n'
                '├── Algorithmic data storage patterns\n'
                '└── Easier maintenance and scaling\n'
                '\nNEXT STEPS:\n'
                '1. Run: python manage.py makemigrations\n'
                '2. Run: python manage.py migrate\n'
                '3. Update views and serializers for new architecture\n'
            )
        )
        
        # Step 3: Update admin.py for ultra-optimized models
        self.create_ultra_admin()
        
        # Step 4: Update serializers for ultra-optimized models
        self.create_ultra_serializers()
        
        # Step 5: Update views for ultra-optimized models
        self.create_ultra_views()

    def create_ultra_admin(self):
        """Create admin interface for ultra-optimized models"""
        admin_content = '''from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from .models import DataNode, EventFlow, SystemRegistry

User = get_user_model()


@admin.register(DataNode)
class DataNodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'node_type', 'node_subtype', 'owner_user', 'is_active', 'created_at']
    list_filter = ['node_type', 'node_subtype', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'owner_user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('node_type', 'node_subtype', 'name', 'code', 'owner_user', 'parent_node')
        }),
        ('Status', {
            'fields': ('is_active', 'status', 'priority')
        }),
        ('Data Storage', {
            'fields': ('data_core', 'data_config', 'data_state', 'data_extended'),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('related_nodes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EventFlow)
class EventFlowAdmin(admin.ModelAdmin):
    list_display = ['title', 'flow_type', 'flow_subtype', 'owner_user', 'amount', 'status', 'event_date']
    list_filter = ['flow_type', 'flow_subtype', 'status', 'priority', 'is_processed', 'event_date']
    search_fields = ['title', 'description', 'owner_user__username']
    readonly_fields = ['id', 'created_at', 'updated_at', 'processed_at']
    date_hierarchy = 'event_date'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('flow_type', 'flow_subtype', 'action', 'owner_user')
        }),
        ('Content', {
            'fields': ('title', 'description', 'amount')
        }),
        ('Relationships', {
            'fields': ('source_node', 'target_node', 'related_flows')
        }),
        ('Status & Timing', {
            'fields': ('status', 'priority', 'is_processed', 'is_read', 'event_date', 'scheduled_at')
        }),
        ('Data Storage', {
            'fields': ('flow_data', 'flow_context', 'flow_result'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'processed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SystemRegistry)
class SystemRegistryAdmin(admin.ModelAdmin):
    list_display = ['registry_key', 'registry_type', 'registry_scope', 'scope_user', 'is_active', 'version']
    list_filter = ['registry_type', 'registry_scope', 'is_active', 'is_encrypted', 'created_at']
    search_fields = ['registry_key', 'name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('registry_type', 'registry_key', 'registry_scope', 'scope_user')
        }),
        ('Content', {
            'fields': ('name', 'description', 'version')
        }),
        ('Status', {
            'fields': ('is_active', 'is_encrypted', 'priority', 'expires_at')
        }),
        ('Data Storage', {
            'fields': ('registry_value', 'registry_meta', 'registry_schema'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
'''
        
        admin_path = os.path.join(settings.BASE_DIR, 'core', 'admin.py')
        with open(admin_path, 'w') as f:
            f.write(admin_content)
        
        self.stdout.write('✓ Updated admin.py for ultra-optimized models')

    def create_ultra_serializers(self):
        """Create serializers for ultra-optimized models"""
        serializers_content = '''from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import DataNode, EventFlow, SystemRegistry

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class DataNodeSerializer(serializers.ModelSerializer):
    """Universal serializer for all data nodes"""
    typed_data = serializers.ReadOnlyField()
    
    class Meta:
        model = DataNode
        fields = [
            'id', 'node_type', 'node_subtype', 'code', 'name', 'owner_user',
            'parent_node', 'related_nodes', 'data_core', 'data_config', 
            'data_state', 'data_extended', 'is_active', 'priority', 'status',
            'typed_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        if not validated_data.get('owner_user'):
            validated_data['owner_user'] = self.context['request'].user
        return super().create(validated_data)


class EventFlowSerializer(serializers.ModelSerializer):
    """Universal serializer for all event flows"""
    source_node_name = serializers.CharField(source='source_node.name', read_only=True)
    target_node_name = serializers.CharField(source='target_node.name', read_only=True)
    typed_data = serializers.ReadOnlyField()
    
    class Meta:
        model = EventFlow
        fields = [
            'id', 'flow_type', 'flow_subtype', 'action', 'owner_user',
            'source_node', 'source_node_name', 'target_node', 'target_node_name',
            'related_flows', 'amount', 'title', 'description', 'flow_data',
            'flow_context', 'flow_result', 'status', 'priority', 'is_processed',
            'is_read', 'event_date', 'scheduled_at', 'typed_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'processed_at']
    
    def create(self, validated_data):
        validated_data['owner_user'] = self.context['request'].user
        return super().create(validated_data)


class SystemRegistrySerializer(serializers.ModelSerializer):
    """Universal serializer for system registry"""
    
    class Meta:
        model = SystemRegistry
        fields = [
            'id', 'registry_type', 'registry_key', 'registry_scope', 'scope_user',
            'registry_value', 'registry_meta', 'registry_schema', 'name',
            'description', 'version', 'is_active', 'is_encrypted', 'priority',
            'expires_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ================================
# LEGACY COMPATIBILITY SERIALIZERS
# ================================

class AccountSerializer(DataNodeSerializer):
    """Legacy account serializer - maps to DataNode with node_type='entity', node_subtype='account'"""
    
    def create(self, validated_data):
        validated_data['node_type'] = 'entity'
        validated_data['node_subtype'] = 'account'
        return super().create(validated_data)


class TransactionSerializer(EventFlowSerializer):
    """Legacy transaction serializer - maps to EventFlow with flow_type='transaction'"""
    
    def create(self, validated_data):
        validated_data['flow_type'] = 'transaction'
        return super().create(validated_data)


class CategorySerializer(DataNodeSerializer):
    """Legacy category serializer - maps to DataNode with node_type='entity', node_subtype='category'"""
    
    def create(self, validated_data):
        validated_data['node_type'] = 'entity'
        validated_data['node_subtype'] = 'category'
        return super().create(validated_data)


class ContactSerializer(DataNodeSerializer):
    """Legacy contact serializer - maps to DataNode with node_type='entity', node_subtype='contact'"""
    
    def create(self, validated_data):
        validated_data['node_type'] = 'entity'
        validated_data['node_subtype'] = 'contact'
        return super().create(validated_data)


class NotificationSerializer(EventFlowSerializer):
    """Legacy notification serializer - maps to EventFlow with flow_type='notification'"""
    
    def create(self, validated_data):
        validated_data['flow_type'] = 'notification'
        return super().create(validated_data)
'''
        
        serializers_path = os.path.join(settings.BASE_DIR, 'core', 'serializers.py')
        with open(serializers_path, 'w') as f:
            f.write(serializers_content)
        
        self.stdout.write('✓ Updated serializers.py for ultra-optimized models')

    def create_ultra_views(self):
        """Create views for ultra-optimized models"""
        views_content = '''from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers_auth import EmailTokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta

from .models import DataNode, EventFlow, SystemRegistry
from .serializers import (
    UserSerializer, DataNodeSerializer, EventFlowSerializer, SystemRegistrySerializer,
    AccountSerializer, TransactionSerializer, CategorySerializer, ContactSerializer,
    NotificationSerializer
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view with secure httpOnly cookies"""
    serializer_class = EmailTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.user
                response.data['user'] = UserSerializer(user).data
                
                # Set secure httpOnly cookies for tokens
                access_token = response.data.get('access')
                refresh_token = response.data.get('refresh')
                
                if access_token:
                    response.set_cookie(
                        'access_token', access_token, max_age=60 * 60,
                        httponly=True, secure=True, samesite='Strict'
                    )
                    
                if refresh_token:
                    response.set_cookie(
                        'refresh_token', refresh_token, max_age=60 * 60 * 24 * 7,
                        httponly=True, secure=True, samesite='Strict'
                    )
                
                response.data.pop('access', None)
                response.data.pop('refresh', None)
        
        return response


class UserViewSet(viewsets.ModelViewSet):
    """User management endpoints"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user profile"""
        profile = request.user.get_profile()
        serializer = DataNodeSerializer(profile)
        return Response(serializer.data)


class DataNodeViewSet(viewsets.ModelViewSet):
    """Universal data node endpoints (accounts, contacts, categories, etc.)"""
    serializer_class = DataNodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = DataNode.objects.filter(owner_user=self.request.user)
        
        # Filter by node type and subtype
        node_type = self.request.query_params.get('node_type')
        node_subtype = self.request.query_params.get('node_subtype')
        
        if node_type:
            queryset = queryset.filter(node_type=node_type)
        if node_subtype:
            queryset = queryset.filter(node_subtype=node_subtype)
            
        return queryset.select_related('owner_user', 'parent_node')
    
    @action(detail=False, methods=['get'], url_path='accounts')
    def accounts(self, request):
        """Get user accounts"""
        accounts = self.get_queryset().filter(node_type='entity', node_subtype='account')
        serializer = self.get_serializer(accounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='contacts')
    def contacts(self, request):
        """Get user contacts"""
        contacts = self.get_queryset().filter(node_type='entity', node_subtype='contact')
        serializer = self.get_serializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Get user categories"""
        categories = self.get_queryset().filter(node_type='entity', node_subtype='category')
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)


class EventFlowViewSet(viewsets.ModelViewSet):
    """Universal event flow endpoints (transactions, notifications, activities)"""
    serializer_class = EventFlowSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = EventFlow.objects.filter(owner_user=self.request.user)
        
        # Filter by flow type and subtype
        flow_type = self.request.query_params.get('flow_type')
        flow_subtype = self.request.query_params.get('flow_subtype')
        
        if flow_type:
            queryset = queryset.filter(flow_type=flow_type)
        if flow_subtype:
            queryset = queryset.filter(flow_subtype=flow_subtype)
            
        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(event_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(event_date__lte=end_date)
            
        return queryset.select_related('owner_user', 'source_node', 'target_node').order_by('-event_date', '-created_at')
    
    @action(detail=False, methods=['get'], url_path='transactions')
    def transactions(self, request):
        """Get user transactions"""
        transactions = self.get_queryset().filter(flow_type='transaction')
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='notifications')
    def notifications(self, request):
        """Get user notifications"""
        notifications = self.get_queryset().filter(flow_type='notification').order_by('-created_at')
        
        # Filter unread only
        if request.query_params.get('unread_only') == 'true':
            notifications = notifications.filter(is_read=False)
            
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='mark-notifications-read')
    def mark_notifications_read(self, request):
        """Mark all notifications as read"""
        updated = self.get_queryset().filter(
            flow_type='notification', is_read=False
        ).update(is_read=True, processed_at=timezone.now())
        
        return Response({'marked_read': updated})


class SystemRegistryViewSet(viewsets.ModelViewSet):
    """System registry endpoints (admin only)"""
    serializer_class = SystemRegistrySerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        return SystemRegistry.objects.all()


# Legacy compatibility views
class AccountViewSet(DataNodeViewSet):
    """Legacy account endpoints"""
    serializer_class = AccountSerializer
    
    def get_queryset(self):
        return super().get_queryset().filter(node_type='entity', node_subtype='account')


class TransactionViewSet(EventFlowViewSet):
    """Legacy transaction endpoints"""
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        return super().get_queryset().filter(flow_type='transaction')


# Additional auth views (keep existing implementation)
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        username = request.data.get('username', email)
        password = request.data.get('password')
        full_name = request.data.get('full_name', '')
        
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User already exists'}, status=400)
            
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=400)
        
        user = User.objects.create_user(
            username=username, email=email, password=password,
            first_name=full_name.split(' ')[0] if full_name else '',
            last_name=' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
        )
        
        # Create user profile as DataNode
        user.get_profile()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    """Get current user info"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
'''
        
        views_path = os.path.join(settings.BASE_DIR, 'core', 'views.py')
        with open(views_path, 'w') as f:
            f.write(views_content)
        
        self.stdout.write('✓ Updated views.py for ultra-optimized models')