from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers_auth import EmailTokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
import csv
import io

from .models import (
    UserProfile, Entity, Transaction, Plan, Activity, Document, SystemConfig,
    UserRelationship, SocialGroup, GroupMembership, Notification
)
from .serializers import (
    UserSerializer, UserProfileSerializer, EntitySerializer, TransactionSerializer,
    PlanSerializer, ActivitySerializer, DocumentSerializer, SystemConfigSerializer,
    UserRelationshipSerializer, SocialGroupSerializer, GroupMembershipSerializer,
    NotificationSerializer
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view that accepts email and returns user info with secure httpOnly cookies"""
    serializer_class = EmailTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Add user info to response
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.user
                response.data['user'] = UserSerializer(user).data
                
                # Set secure httpOnly cookies for tokens
                access_token = response.data.get('access')
                refresh_token = response.data.get('refresh')
                
                if access_token:
                    response.set_cookie(
                        'access_token',
                        access_token,
                        max_age=60 * 60,  # 1 hour
                        httponly=True,
                        secure=True,  # HTTPS only
                        samesite='Strict'
                    )
                    
                if refresh_token:
                    response.set_cookie(
                        'refresh_token',
                        refresh_token,
                        max_age=60 * 60 * 24 * 7,  # 7 days
                        httponly=True,
                        secure=True,  # HTTPS only
                        samesite='Strict'
                    )
                
                # Remove tokens from response body for security
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
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class EntityViewSet(viewsets.ModelViewSet):
    """Universal entity management endpoints (accounts, contacts, categories, tags, goals, investments)"""
    serializer_class = EntitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Entity.objects.filter(user=self.request.user).select_related('user')
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        return queryset
    
    @action(detail=False, methods=['get'])
    def accounts_summary(self, request):
        """Get account summary statistics"""
        accounts = self.get_queryset().filter(entity_type='account')
        
        total_balance = sum(
            Decimal(str(account.data.get('balance', '0')))
            for account in accounts
        )
        
        accounts_by_type = {}
        for account in accounts:
            account_type = account.data.get('account_type', 'unknown')
            if account_type not in accounts_by_type:
                accounts_by_type[account_type] = {'count': 0, 'total_balance': Decimal('0')}
            accounts_by_type[account_type]['count'] += 1
            accounts_by_type[account_type]['total_balance'] += Decimal(str(account.data.get('balance', '0')))
        
        summary_data = {
            'total_balance': total_balance,
            'account_count': accounts.count(),
            'accounts_by_type': accounts_by_type
        }
        
        return Response(summary_data)
    
    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Get categories"""
        categories = self.get_queryset().filter(entity_type='category')
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='tags')
    def tags(self, request):
        """Get tags"""
        tags = self.get_queryset().filter(entity_type='tag')
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='contacts')
    def contacts(self, request):
        """Get contacts"""
        contacts = self.get_queryset().filter(entity_type='contact')
        serializer = self.get_serializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='goals')
    def goals(self, request):
        """Get financial goals"""
        goals = self.get_queryset().filter(entity_type='goal')
        serializer = self.get_serializer(goals, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='add-tag')
    def add_tag(self, request, pk=None):
        """Add tag to entity"""
        entity = self.get_object()
        tag_name = request.data.get('tag')
        
        if not tag_name:
            return Response({'error': 'Tag name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        entity.add_tag(tag_name)
        return Response({'message': f'Tag "{tag_name}" added successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='remove-tag')
    def remove_tag(self, request, pk=None):
        """Remove tag from entity"""
        entity = self.get_object()
        tag_name = request.data.get('tag')
        
        if not tag_name:
            return Response({'error': 'Tag name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        entity.remove_tag(tag_name)
        return Response({'message': f'Tag "{tag_name}" removed successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='set-tags')
    def set_tags(self, request, pk=None):
        """Set all tags for entity"""
        entity = self.get_object()
        tags = request.data.get('tags', [])
        
        if not isinstance(tags, list):
            return Response({'error': 'Tags must be an array'}, status=status.HTTP_400_BAD_REQUEST)
        
        entity.set_tags(tags)
        return Response({'message': 'Tags updated successfully', 'tags': entity.tags}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='all-tags')
    def all_tags(self, request):
        """Get all unique tags used by user's entities"""
        entities = self.get_queryset()
        all_tags = set()
        
        for entity in entities:
            all_tags.update(entity.tags)
        
        # Count usage for each tag
        tag_usage = {}
        for entity in entities:
            for tag in entity.tags:
                tag_usage[tag] = tag_usage.get(tag, 0) + 1
        
        tags_with_count = [
            {'name': tag, 'usage_count': tag_usage[tag]}
            for tag in sorted(all_tags)
        ]
        
        return Response(tags_with_count)
    
    @action(detail=False, methods=['get'], url_path='by-tag')
    def by_tag(self, request):
        """Get entities filtered by tag"""
        tag = request.query_params.get('tag')
        if not tag:
            return Response({'error': 'Tag parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        entities = self.get_queryset().filter(tags__contains=[tag.lower()])
        serializer = self.get_serializer(entities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='upload-csv')
    def upload_csv(self, request):
        """Upload CSV file and create transactions"""
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        account_id = request.data.get('account_id')
        if not account_id:
            return Response({'error': 'Account ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account = Entity.objects.get(id=account_id, user=request.user, entity_type='account')
        except Entity.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        
        csv_file = request.FILES['file']
        
        try:
            # Read CSV file
            decoded_file = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))
            
            transactions_created = 0
            errors = []
            
            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    amount = Decimal(str(row.get('amount', '0')))
                    transaction_type = 'expense' if amount < 0 else 'income'
                    amount = abs(amount)
                    
                    transaction_data = {
                        'description': row.get('description', ''),
                        'amount': amount,
                        'date': datetime.strptime(row.get('date', ''), '%Y-%m-%d').date(),
                        'merchant_name': row.get('merchant', ''),
                        'original_description': row.get('original_description', ''),
                    }
                    
                    Transaction.objects.create(
                        user=request.user,
                        primary_entity=account,
                        transaction_type=transaction_type,
                        amount=amount,
                        description=transaction_data['description'],
                        date=transaction_data['date'],
                        transaction_data=transaction_data
                    )
                    transactions_created += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
            return Response({
                'transactions_created': transactions_created,
                'errors': errors
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TransactionViewSet(viewsets.ModelViewSet):
    """Transaction management endpoints"""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user).select_related(
            'user', 'primary_entity', 'secondary_entity'
        )
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by account (primary entity)
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(primary_entity_id=account_id)
            
        # Filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        return queryset.order_by('-date', '-created_at')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get transaction summary statistics"""
        transactions = self.get_queryset()
        
        # Calculate totals
        income_total = transactions.filter(transaction_type='income').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        expense_total = transactions.filter(transaction_type='expense').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        net_income = income_total - expense_total
        
        # Get recent transactions
        recent_transactions = transactions[:10]
        
        summary_data = {
            'total_income': income_total,
            'total_expenses': expense_total,
            'net_income': net_income,
            'transaction_count': transactions.count(),
            'recent_transactions': recent_transactions
        }
        
        serializer = TransactionSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update transactions"""
        transaction_ids = request.data.get('transaction_ids', [])
        update_data = request.data.get('update_data', {})
        
        if not transaction_ids:
            return Response({'error': 'No transaction IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        transactions = Transaction.objects.filter(
            id__in=transaction_ids,
            user=request.user
        )
        
        # Update fields
        update_fields = {}
        if 'primary_entity_id' in update_data:
            update_fields['primary_entity_id'] = update_data['primary_entity_id']
        if 'secondary_entity_id' in update_data:
            update_fields['secondary_entity_id'] = update_data['secondary_entity_id']
        if 'status' in update_data:
            update_fields['status'] = update_data['status']
        
        updated_count = transactions.update(**update_fields)
        
        # Handle categories and tags in transaction_data JSON field
        if 'categories' in update_data or 'tags' in update_data:
            for transaction in transactions:
                if 'categories' in update_data:
                    transaction.categories = update_data['categories']
                if 'tags' in update_data:
                    transaction.tags = update_data['tags']
                transaction.save()
        
        return Response({'updated_count': updated_count})
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete transactions"""
        transaction_ids = request.data.get('transaction_ids', [])
        
        if not transaction_ids:
            return Response({'error': 'No transaction IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_count, _ = Transaction.objects.filter(
            id__in=transaction_ids,
            user=request.user
        ).delete()
        
        return Response({'deleted_count': deleted_count})




class SocialGroupViewSet(viewsets.ModelViewSet):
    """Social group management endpoints"""
    serializer_class = SocialGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Get groups where user is owner or member
        user_groups = SocialGroup.objects.filter(
            Q(owner=self.request.user) | 
            Q(groupmembership__user=self.request.user, groupmembership__is_active=True)
        ).distinct().select_related('owner').prefetch_related('groupmembership_set__user')
        return user_groups
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add member to group"""
        group = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'member')
        
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_to_add = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        membership, created = GroupMembership.objects.get_or_create(
            group=group,
            user=user_to_add,
            defaults={'role': role, 'is_active': True}
        )
        
        if not created and not membership.is_active:
            membership.is_active = True
            membership.role = role
            membership.save()
        
        # Create notification for added user
        Notification.objects.create(
            user=user_to_add,
            notification_type='group_invitation',
            title='Added to Group',
            message=f'You have been added to group "{group.name}"',
            related_group=group,
            priority='medium'
        )
        
        serializer = GroupMembershipSerializer(membership)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_expense(self, request, pk=None):
        """Add expense to group"""
        group = self.get_object()
        description = request.data.get('description')
        amount = request.data.get('amount')
        split_type = request.data.get('split_type', 'equal')
        
        if not description or not amount:
            return Response({'error': 'description and amount required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create transaction for group expense
        transaction = Transaction.objects.create(
            user=request.user,
            transaction_type='group_expense',
            amount=Decimal(str(amount)),
            description=description,
            date=timezone.now().date(),
            status='pending',
            transaction_data={
                'group_id': group.id,
                'split_type': split_type,
                'participants': request.data.get('participants', [])
            }
        )
        
        # Notify all group members
        for membership in group.groupmembership_set.filter(is_active=True):
            if membership.user != request.user:
                Notification.objects.create(
                    user=membership.user,
                    notification_type='group_expense',
                    title='New Group Expense',
                    message=f'{request.user.get_full_name() or request.user.username} added expense "{description}" to {group.name}',
                    related_group=group,
                    related_transaction=transaction,
                    priority='medium'
                )
        
        serializer = TransactionSerializer(transaction)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """Notification management endpoints"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related(
            'related_entity', 'related_transaction', 'related_group'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'marked_read': updated})


class UserProfileViewSet(viewsets.ModelViewSet):
    """User profile management endpoints"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user profile"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class PlanViewSet(viewsets.ModelViewSet):
    """Subscription plan management endpoints"""
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Plan.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available plans for subscription"""
        plans = self.get_queryset()
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """Activity log endpoints (read-only)"""
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Activity.objects.filter(user=self.request.user).select_related(
            'related_entity', 'related_transaction'
        ).order_by('-created_at')


class DocumentViewSet(viewsets.ModelViewSet):
    """Document management endpoints"""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def process_ai(self, request, pk=None):
        """Process document with AI"""
        document = self.get_object()
        # AI processing logic would go here
        document.ai_processed = True
        document.save()
        
        serializer = self.get_serializer(document)
        return Response(serializer.data)


class UserRelationshipViewSet(viewsets.ModelViewSet):
    """User relationship management endpoints"""
    serializer_class = UserRelationshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserRelationship.objects.filter(
            Q(user=self.request.user) | Q(related_user=self.request.user)
        ).select_related('user', 'related_user')
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve relationship request"""
        relationship = self.get_object()
        if relationship.related_user == request.user:
            relationship.status = 'approved'
            relationship.save()
            
            # Create notification for the requester
            Notification.objects.create(
                user=relationship.user,
                notification_type='relationship_approved',
                title='Relationship Approved',
                message=f'{request.user.get_full_name() or request.user.username} approved your relationship request',
                priority='medium'
            )
            
        serializer = self.get_serializer(relationship)
        return Response(serializer.data)


class GroupMembershipViewSet(viewsets.ModelViewSet):
    """Group membership management endpoints"""
    serializer_class = GroupMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return GroupMembership.objects.filter(user=self.request.user).select_related(
            'group', 'user'
        )


# Additional Auth Views
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
            username=username,
            email=email,
            password=password,
            first_name=full_name.split(' ')[0] if full_name else '',
            last_name=' '.join(full_name.split(' ')[1:]) if ' ' in full_name else ''
        )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        })


class LogoutView(APIView):
    """User logout endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    """Get current user info - maps to /users/me/"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_user_preferences(request):
    """Update user preferences"""
    user = request.user
    data = request.data
    
    if 'preferred_currency' in data:
        # You'll need to add this field to your User model
        pass
    if 'preferred_date_format' in data:
        # You'll need to add this field to your User model  
        pass
    if 'enable_notifications' in data:
        # You'll need to add this field to your User model
        pass
    if 'full_name' in data:
        names = data['full_name'].split(' ', 1)
        user.first_name = names[0]
        user.last_name = names[1] if len(names) > 1 else ''
        
    user.save()
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Change user password"""
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'error': 'Both current and new password required'}, status=400)
        
    user = request.user
    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=400)
        
    user.set_password(new_password)
    user.save()
    
    return Response({'message': 'Password changed successfully'})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_user_account(request):
    """Delete user account"""
    user = request.user
    user.delete()
    return Response({'message': 'Account deleted successfully'})