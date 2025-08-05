"""
Management command to migrate from current models to optimized models
This command will handle the transition from the current model structure to the optimized one
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal

from core.models import (
    # Current models
    Account, Category, Tag, Transaction as OldTransaction, Goal,
    Contact, GroupExpense, GroupExpenseShare,
    LendingTransaction, SubscriptionPlan, UserSubscription, UserAISettings,
    RecurringTransaction, Investment as OldInvestment, 
    InvestmentTransaction as OldInvestmentTransaction,
    InvestmentPortfolio, PlanAddon, UserPlanCustomization,
    Invoice as OldInvoice, AIUsageLog
)


class Command(BaseCommand):
    help = 'Migrate from current models to optimized models'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes to see what would be migrated',
        )
        parser.add_argument(
            '--step',
            type=str,
            choices=['users', 'transactions', 'investments', 'plans', 'logs', 'all'],
            default='all',
            help='Migrate only specific step',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        step = options['step']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        try:
            with transaction.atomic():
                if step == 'all' or step == 'users':
                    self.migrate_user_profiles()
                
                if step == 'all' or step == 'transactions':
                    self.migrate_transactions()
                
                if step == 'all' or step == 'investments':
                    self.migrate_investments()
                
                if step == 'all' or step == 'plans':
                    self.migrate_plans()
                
                if step == 'all' or step == 'logs':
                    self.migrate_activity_logs()
                
                if dry_run:
                    # Rollback transaction in dry run mode
                    raise Exception("Dry run - rolling back changes")
                    
        except Exception as e:
            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS('Dry run completed successfully')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'Migration failed: {str(e)}')
                )
                raise
    
    def migrate_user_profiles(self):
        """Migrate user subscription and AI settings to UserProfile"""
        from core.models_optimized import UserProfile, Plan
        
        self.stdout.write('Migrating user profiles...')
        
        migrated_count = 0
        
        for user in User.objects.all():
            # Check if profile already exists
            if hasattr(user, 'profile') and user.profile:
                continue
            
            # Get existing subscription data
            try:
                user_subscription = UserSubscription.objects.get(user=user)
                ai_settings = UserAISettings.objects.filter(user=user).first()
                plan_customization = UserPlanCustomization.objects.filter(user_subscription=user_subscription).first()
            except UserSubscription.DoesNotExist:
                # Create default subscription for users without one
                user_subscription = None
                ai_settings = None
                plan_customization = None
            
            # Create UserProfile
            profile_data = {
                'user': user,
                'subscription_status': user_subscription.status if user_subscription else 'trial',
                'subscription_start_date': user_subscription.start_date if user_subscription else timezone.now(),
                'subscription_end_date': user_subscription.end_date if user_subscription else None,
                'is_auto_renew': user_subscription.is_auto_renew if user_subscription else True,
                'ai_credits_remaining': user_subscription.ai_credits_remaining if user_subscription else 100,
                'ai_credits_used_this_month': user_subscription.ai_credits_used_this_month if user_subscription else 0,
                'transactions_this_month': user_subscription.transactions_this_month if user_subscription else 0,
                'last_reset_date': user_subscription.last_reset_date if user_subscription else timezone.now().date(),
            }
            
            # Add AI settings if they exist
            if ai_settings:
                profile_data.update({
                    'preferred_ai_provider': ai_settings.preferred_provider,
                    'openai_api_key': ai_settings.openai_api_key,
                    'openai_model': ai_settings.openai_model,
                    'ollama_endpoint': ai_settings.ollama_endpoint,
                    'ollama_model': ai_settings.ollama_model,
                    'enable_ai_suggestions': ai_settings.enable_ai_suggestions,
                    'enable_ai_categorization': ai_settings.enable_ai_categorization,
                    'enable_ai_invoice_generation': ai_settings.enable_ai_invoice_generation,
                })
            
            # Add plan customization if it exists
            if plan_customization:
                profile_data.update({
                    'total_ai_credits': plan_customization.total_ai_credits,
                    'total_transactions_limit': plan_customization.total_transactions_limit,
                    'total_accounts_limit': plan_customization.total_accounts_limit,
                    'total_storage_gb': plan_customization.total_storage_gb,
                    'custom_features': plan_customization.custom_features,
                    'total_monthly_cost': plan_customization.total_monthly_cost,
                })
            
            # Create the profile
            profile = UserProfile.objects.create(**profile_data)
            migrated_count += 1
            
            self.stdout.write(f'Migrated profile for user: {user.username}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} user profiles')
        )
    
    def migrate_transactions(self):
        """Migrate various transaction types to unified Transaction model"""
        from core.models_optimized import Transaction
        
        self.stdout.write('Migrating transactions...')
        
        migrated_count = 0
        
        # Migrate standard transactions
        for old_tx in OldTransaction.objects.all():
            new_tx_data = {
                'user': old_tx.user,
                'transaction_category': 'standard',
                'transaction_type': old_tx.transaction_type,
                'account': old_tx.account,
                'transfer_account': old_tx.transfer_account,
                'category': old_tx.category,
                'suggested_category': old_tx.suggested_category,
                'amount': old_tx.amount,
                'description': old_tx.description,
                'date': old_tx.date,
                'currency': 'USD',  # Default
                'notes': old_tx.notes,
                'external_id': old_tx.external_id,
                'merchant_name': old_tx.merchant_name,
                'original_description': old_tx.original_description,
                'verified': old_tx.verified,
                'status': 'active',
                'created_at': old_tx.created_at,
                'updated_at': old_tx.updated_at,
            }
            
            new_tx = Transaction(**new_tx_data)
            new_tx.save()
            
            # Copy tags
            new_tx.tags.set(old_tx.tags.all())
            
            migrated_count += 1
        
        # Migrate recurring transactions as templates
        for old_recurring in RecurringTransaction.objects.all():
            template_data = {
                'user': old_recurring.user,
                'transaction_category': 'recurring_template',
                'transaction_type': old_recurring.transaction_type,
                'account': old_recurring.account,
                'transfer_account': old_recurring.transfer_account,
                'category': old_recurring.category,
                'amount': old_recurring.amount,
                'description': old_recurring.description,
                'date': old_recurring.start_date,
                'currency': 'USD',
                'notes': old_recurring.name,
                'is_template': True,
                'template_name': old_recurring.name,
                'frequency': old_recurring.frequency,
                'frequency_interval': old_recurring.frequency_interval,
                'start_date': old_recurring.start_date,
                'end_date': old_recurring.end_date,
                'max_executions': old_recurring.max_executions,
                'next_execution_date': old_recurring.next_execution_date,
                'is_active_template': old_recurring.is_active,
                'is_manual': old_recurring.is_manual,
                'auto_categorize': old_recurring.auto_categorize,
                'execution_conditions': old_recurring.execution_conditions,
                'status': 'active',
            }
            
            Transaction.objects.create(**template_data)
            migrated_count += 1
        
        # Migrate lending transactions
        for old_lending in LendingTransaction.objects.all():
            lending_data = {
                'user': old_lending.user,
                'transaction_category': 'lending',
                'transaction_type': 'lend' if old_lending.transaction_type == 'lend' else 'borrow',
                'contact': old_lending.contact,
                'amount': old_lending.amount,
                'description': old_lending.description,
                'date': old_lending.date,
                'currency': old_lending.currency,
                'notes': old_lending.notes,
                'due_date': old_lending.due_date,
                'interest_rate': old_lending.interest_rate,
                'status': old_lending.status,
            }
            
            Transaction.objects.create(**lending_data)
            migrated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} transactions')
        )
    
    def migrate_investments(self):
        """Migrate investment models"""
        from core.models_optimized import Investment, Transaction
        
        self.stdout.write('Migrating investments...')
        
        migrated_count = 0
        
        # Migrate investments
        for old_inv in OldInvestment.objects.all():
            # Map status to is_active
            is_active = old_inv.status == 'active'
            
            # Determine portfolio name from any existing portfolio relationship
            portfolio_name = 'Default'
            try:
                if hasattr(old_inv, 'portfolios') and old_inv.portfolios.exists():
                    portfolio_name = old_inv.portfolios.first().name
            except:
                pass
            
            inv_data = {
                'user': old_inv.user,
                'symbol': old_inv.symbol,
                'name': old_inv.name,
                'investment_type': old_inv.investment_type,
                'sector': old_inv.sector or '',
                'current_price': old_inv.current_price,
                'currency': old_inv.currency,
                'last_price_update': old_inv.last_price_update,
                'price_source': old_inv.price_source,
                'auto_update_price': old_inv.auto_update_price,
                'portfolio_name': portfolio_name,
                'description': old_inv.description,
                'risk_level': old_inv.risk_level,
                'dividend_yield': old_inv.dividend_yield,
                'market_cap': old_inv.market_cap,
                'pe_ratio': old_inv.pe_ratio,
                'beta': old_inv.beta,
                'fifty_two_week_high': old_inv.fifty_two_week_high,
                'fifty_two_week_low': old_inv.fifty_two_week_low,
                'is_active': is_active,
            }
            
            new_inv = Investment.objects.create(**inv_data)
            
            # Migrate investment transactions
            for old_inv_tx in OldInvestmentTransaction.objects.filter(investment=old_inv):
                tx_data = {
                    'user': old_inv.user,
                    'transaction_category': 'investment',
                    'transaction_type': old_inv_tx.transaction_type,
                    'investment': new_inv,
                    'quantity': old_inv_tx.quantity,
                    'price_per_unit': old_inv_tx.price_per_unit,
                    'fees': old_inv_tx.fees,
                    'amount': old_inv_tx.total_amount,
                    'description': f"{old_inv_tx.transaction_type.title()} {old_inv_tx.quantity} shares of {new_inv.symbol}",
                    'date': old_inv_tx.date,
                    'currency': new_inv.currency,
                    'notes': old_inv_tx.notes,
                    'status': 'active',
                }
                
                Transaction.objects.create(**tx_data)
            
            migrated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} investments')
        )
    
    def migrate_plans(self):
        """Migrate plan system to unified Plan model"""
        from core.models_optimized import Plan, UserPlanAssignment, UserAddon
        
        self.stdout.write('Migrating plans...')
        
        migrated_count = 0
        
        # Migrate subscription plans to base plans
        for old_plan in SubscriptionPlan.objects.all():
            plan_data = {
                'name': old_plan.name,
                'plan_type': 'base',
                'description': f"{old_plan.plan_type.title()} plan",
                'price': old_plan.price,
                'billing_cycle': 'monthly',
                'ai_credits_per_month': old_plan.ai_credits_per_month,
                'max_transactions_per_month': old_plan.max_transactions_per_month,
                'max_accounts': old_plan.max_accounts,
                'features': old_plan.features,
                'is_active': old_plan.is_active,
            }
            
            Plan.objects.create(**plan_data)
            migrated_count += 1
        
        # Migrate plan addons
        for old_addon in PlanAddon.objects.all():
            addon_data = {
                'name': old_addon.name,
                'plan_type': 'addon',
                'description': old_addon.description,
                'price': old_addon.price,
                'billing_cycle': old_addon.billing_cycle,
                'ai_credits_per_month': old_addon.credits_amount or 0,
                'max_transactions_per_month': old_addon.transaction_increase or 0,
                'max_accounts': old_addon.account_increase or 0,
                'storage_gb': old_addon.storage_gb or 0,
                'features': old_addon.feature_flags,
                'is_stackable': old_addon.is_stackable,
                'max_quantity': old_addon.max_quantity,
                'is_active': old_addon.is_active,
            }
            
            Plan.objects.create(**addon_data)
            migrated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} plans')
        )
    
    def migrate_activity_logs(self):
        """Migrate various log models to unified ActivityLog"""
        from core.models_optimized import ActivityLog
        
        self.stdout.write('Migrating activity logs...')
        
        migrated_count = 0
        
        # Migrate AI usage logs
        for old_log in AIUsageLog.objects.all():
            log_data = {
                'user': old_log.user,
                'activity_type': 'ai_usage',
                'object_type': 'ai_request',
                'object_id': str(old_log.id),
                'status': 'completed' if old_log.success else 'failed',
                'details': {
                    'usage_type': old_log.usage_type,
                    'provider': old_log.provider,
                    'model_used': old_log.model_used,
                    'credits_consumed': old_log.credits_consumed,
                    'tokens_used': old_log.tokens_used,
                    'error_message': old_log.error_message,
                    'processing_time': old_log.processing_time,
                },
                'created_at': old_log.created_at,
            }
            
            ActivityLog.objects.create(**log_data)
            migrated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {migrated_count} activity logs')
        )
    
    def get_migration_statistics(self):
        """Get statistics about what needs to be migrated"""
        stats = {
            'users': User.objects.count(),
            'old_transactions': OldTransaction.objects.count(),
            'recurring_transactions': RecurringTransaction.objects.count(),
            'lending_transactions': LendingTransaction.objects.count(),
            'investments': OldInvestment.objects.count(),
            'investment_transactions': OldInvestmentTransaction.objects.count(),
            'subscription_plans': SubscriptionPlan.objects.count(),
            'plan_addons': PlanAddon.objects.count(),
            'ai_logs': AIUsageLog.objects.count(),
        }
        
        return stats