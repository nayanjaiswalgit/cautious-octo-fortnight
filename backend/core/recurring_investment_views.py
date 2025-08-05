"""
Views for recurring transactions and investment management
"""

from decimal import Decimal
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    RecurringTransaction, RecurringTransactionExecution,
    Investment, InvestmentTransaction, InvestmentPortfolio, InvestmentPriceHistory,
    Account, Category, Transaction
)
from .serializers import (
    RecurringTransactionSerializer, RecurringTransactionExecutionSerializer,
    InvestmentSerializer, InvestmentTransactionSerializer, 
    InvestmentPortfolioSerializer, InvestmentPriceHistorySerializer
)


class RecurringTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return RecurringTransaction.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def execute_now(self, request, pk=None):
        """Manually execute a recurring transaction"""
        recurring_transaction = self.get_object()
        
        try:
            execution = recurring_transaction.execute_transaction()
            if execution.status == 'completed':
                return Response({
                    'success': True,
                    'message': 'Transaction executed successfully',
                    'execution_id': execution.id,
                    'transaction_id': execution.transaction_created.id if execution.transaction_created else None
                })
            else:
                return Response({
                    'success': False,
                    'message': f'Transaction failed: {execution.error_message}',
                    'execution_id': execution.id
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error executing transaction: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status of recurring transaction"""
        recurring_transaction = self.get_object()
        recurring_transaction.is_active = not recurring_transaction.is_active
        recurring_transaction.save()
        
        return Response({
            'success': True,
            'is_active': recurring_transaction.is_active,
            'message': f'Recurring transaction {"activated" if recurring_transaction.is_active else "deactivated"}'
        })
    
    @action(detail=False, methods=['get'])
    def due_for_execution(self, request):
        """Get recurring transactions due for execution"""
        now = timezone.now().date()
        due_transactions = self.get_queryset().filter(
            is_active=True,
            start_date__lte=now
        )
        
        # Filter by next execution date
        due_list = []
        for rt in due_transactions:
            next_date = rt.next_execution_date
            if next_date and next_date <= now:
                # Check if end date hasn't passed
                if not rt.end_date or now <= rt.end_date:
                    # Check if max executions hasn't been reached
                    if not rt.max_executions or rt.total_executions < rt.max_executions:
                        due_list.append(rt)
        
        serializer = self.get_serializer(due_list, many=True)
        return Response({
            'count': len(due_list),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def batch_execute(self, request):
        """Execute all due recurring transactions"""
        due_transactions = self.get_queryset().filter(
            is_active=True,
            start_date__lte=timezone.now().date()
        )
        
        results = []
        for rt in due_transactions:
            next_date = rt.next_execution_date
            if next_date and next_date <= timezone.now().date():
                if not rt.end_date or timezone.now().date() <= rt.end_date:
                    if not rt.max_executions or rt.total_executions < rt.max_executions:
                        try:
                            execution = rt.execute_transaction()
                            results.append({
                                'recurring_transaction_id': rt.id,
                                'success': execution.status == 'completed',
                                'execution_id': execution.id,
                                'message': execution.error_message or 'Success'
                            })
                        except Exception as e:
                            results.append({
                                'recurring_transaction_id': rt.id,
                                'success': False,
                                'message': str(e)
                            })
        
        successful = sum(1 for r in results if r['success'])
        return Response({
            'total_processed': len(results),
            'successful': successful,
            'failed': len(results) - successful,
            'results': results
        })


class RecurringTransactionExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RecurringTransactionExecutionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return RecurringTransactionExecution.objects.filter(
            recurring_transaction__user=self.request.user
        ).order_by('-created_at')


class InvestmentViewSet(viewsets.ModelViewSet):
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def buy(self, request, pk=None):
        """Buy shares of this investment"""
        investment = self.get_object()
        
        quantity = request.data.get('quantity')
        price_per_unit = request.data.get('price_per_unit')
        fees = request.data.get('fees', 0)
        notes = request.data.get('notes', '')
        
        if not quantity or not price_per_unit:
            return Response({
                'error': 'Quantity and price_per_unit are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quantity = Decimal(str(quantity))
            price_per_unit = Decimal(str(price_per_unit))
            fees = Decimal(str(fees))
            total_amount = (quantity * price_per_unit) + fees
            
            # Create buy transaction
            transaction = InvestmentTransaction.objects.create(
                investment=investment,
                transaction_type='buy',
                quantity=quantity,
                price_per_unit=price_per_unit,
                total_amount=total_amount,
                fees=fees,
                date=timezone.now().date(),
                notes=notes
            )
            
            # Update current price if this is more recent
            if not investment.last_price_update or investment.last_price_update < timezone.now():
                investment.current_price = price_per_unit
                investment.last_price_update = timezone.now()
                investment.save()
            
            return Response({
                'success': True,
                'message': f'Bought {quantity} shares at ${price_per_unit} each',
                'transaction_id': transaction.id,
                'total_cost': float(total_amount)
            })
        
        except (ValueError, TypeError) as e:
            return Response({
                'error': f'Invalid numeric values: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def sell(self, request, pk=None):
        """Sell shares of this investment"""
        investment = self.get_object()
        
        quantity = request.data.get('quantity')
        price_per_unit = request.data.get('price_per_unit')
        fees = request.data.get('fees', 0)
        notes = request.data.get('notes', '')
        
        if not quantity or not price_per_unit:
            return Response({
                'error': 'Quantity and price_per_unit are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quantity = Decimal(str(quantity))
            price_per_unit = Decimal(str(price_per_unit))
            fees = Decimal(str(fees))
            
            # Check if user has enough shares
            current_quantity = investment.current_quantity
            if quantity > current_quantity:
                return Response({
                    'error': f'Cannot sell {quantity} shares. You only own {current_quantity} shares.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            total_amount = (quantity * price_per_unit) - fees
            
            # Create sell transaction
            transaction = InvestmentTransaction.objects.create(
                investment=investment,
                transaction_type='sell',
                quantity=quantity,
                price_per_unit=price_per_unit,
                total_amount=total_amount,
                fees=fees,
                date=timezone.now().date(),
                notes=notes
            )
            
            # Update current price
            investment.current_price = price_per_unit
            investment.last_price_update = timezone.now()
            investment.save()
            
            return Response({
                'success': True,
                'message': f'Sold {quantity} shares at ${price_per_unit} each',
                'transaction_id': transaction.id,
                'total_received': float(total_amount)
            })
        
        except (ValueError, TypeError) as e:
            return Response({
                'error': f'Invalid numeric values: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_price(self, request, pk=None):
        """Manually update the current price of an investment"""
        investment = self.get_object()
        
        price = request.data.get('price')
        source = request.data.get('source', 'manual')
        
        if not price:
            return Response({
                'error': 'Price is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            price = Decimal(str(price))
            
            # Update investment price
            investment.current_price = price
            investment.last_price_update = timezone.now()
            investment.price_source = source
            investment.save()
            
            # Add to price history
            InvestmentPriceHistory.objects.create(
                investment=investment,
                date=timezone.now().date(),
                price=price,
                source=source
            )
            
            return Response({
                'success': True,
                'message': f'Price updated to ${price}',
                'new_price': float(price)
            })
        
        except (ValueError, TypeError) as e:
            return Response({
                'error': f'Invalid price value: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def performance_summary(self, request):
        """Get overall investment performance summary"""
        investments = self.get_queryset().filter(is_active=True)
        
        total_value = sum(inv.current_value or 0 for inv in investments)
        total_invested = sum(inv.total_invested or 0 for inv in investments)
        total_gain_loss = total_value - total_invested
        total_gain_loss_percentage = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
        
        # Sector breakdown
        sector_breakdown = {}
        for inv in investments:
            sector = inv.sector or 'Other'
            if sector not in sector_breakdown:
                sector_breakdown[sector] = {'value': 0, 'count': 0}
            sector_breakdown[sector]['value'] += float(inv.current_value or 0)
            sector_breakdown[sector]['count'] += 1
        
        # Top performers
        top_performers = sorted(investments, key=lambda x: x.total_gain_loss_percentage or 0, reverse=True)[:5]
        worst_performers = sorted(investments, key=lambda x: x.total_gain_loss_percentage or 0)[:5]
        
        return Response({
            'total_value': float(total_value),
            'total_invested': float(total_invested),
            'total_gain_loss': float(total_gain_loss),
            'total_gain_loss_percentage': float(total_gain_loss_percentage),
            'investments_count': len(investments),
            'sector_breakdown': sector_breakdown,
            'top_performers': InvestmentSerializer(top_performers, many=True).data,
            'worst_performers': InvestmentSerializer(worst_performers, many=True).data
        })


class InvestmentTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = InvestmentTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return InvestmentTransaction.objects.filter(
            investment__user=self.request.user
        ).order_by('-date', '-created_at')


class InvestmentPortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = InvestmentPortfolioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return InvestmentPortfolio.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def add_investment(self, request, pk=None):
        """Add an investment to this portfolio"""
        portfolio = self.get_object()
        investment_id = request.data.get('investment_id')
        
        if not investment_id:
            return Response({
                'error': 'investment_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            investment = Investment.objects.get(id=investment_id, user=request.user)
            portfolio.investments.add(investment)
            portfolio.calculate_metrics()
            
            return Response({
                'success': True,
                'message': f'Added {investment.name} to {portfolio.name}'
            })
        except Investment.DoesNotExist:
            return Response({
                'error': 'Investment not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_investment(self, request, pk=None):
        """Remove an investment from this portfolio"""
        portfolio = self.get_object()
        investment_id = request.data.get('investment_id')
        
        if not investment_id:
            return Response({
                'error': 'investment_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            investment = Investment.objects.get(id=investment_id, user=request.user)
            portfolio.investments.remove(investment)
            portfolio.calculate_metrics()
            
            return Response({
                'success': True,
                'message': f'Removed {investment.name} from {portfolio.name}'
            })
        except Investment.DoesNotExist:
            return Response({
                'error': 'Investment not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def rebalance(self, request, pk=None):
        """Rebalance portfolio to target allocations"""
        portfolio = self.get_object()
        target_allocations = request.data.get('target_allocations', {})
        
        if not target_allocations:
            return Response({
                'error': 'target_allocations is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # This is a complex operation that would require actual trading
        # For now, we'll just return a calculation of what needs to be done
        current_allocations = portfolio.sector_allocation
        rebalance_actions = []
        
        for sector, target_percent in target_allocations.items():
            current_percent = current_allocations.get(sector, 0)
            difference = target_percent - current_percent
            
            if abs(difference) > 1:  # Only rebalance if difference > 1%
                action = 'buy' if difference > 0 else 'sell'
                rebalance_actions.append({
                    'sector': sector,
                    'action': action,
                    'percentage_change': abs(difference),
                    'estimated_amount': float(portfolio.total_value or 0) * abs(difference) / 100
                })
        
        return Response({
            'rebalance_actions': rebalance_actions,
            'message': f'Portfolio analysis complete. {len(rebalance_actions)} actions recommended.'
        })


class InvestmentPriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvestmentPriceHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return InvestmentPriceHistory.objects.filter(
            investment__user=self.request.user
        ).order_by('-date')