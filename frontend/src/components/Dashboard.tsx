import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Plus,
  PieChart as PieChartIcon, BarChart3, RefreshCw, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/preferences';
import { apiClient } from '../api/client';
import { useToast } from './Toast';
import { FormModal } from './FormModal';
import { LoadingSpinner } from './LoadingSpinner';
import { Select } from './Select';
import { ColoredCircle } from './ColoredCircle';
import { ProgressBar } from './ProgressBar';
import { Card } from './Card';
import { Button } from './Button';
import type { Filter } from '../types';

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

interface AnalyticsData {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  avgTransaction: number;
  avgIncome: number;
  avgExpenses: number;
  topCategory: string;
  topCategoryAmount: number;
  transactionTrend: number; // percentage change
  incomeTrend: number;
  expensesTrend: number;
}

export const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const { state, fetchTransactions, fetchSummary, createTransaction } = useData();
  const navigate = useNavigate();
  const { showSuccess, showError, ToastContainer } = useToast();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');
  
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: '',
    notes: '',
    transactionType: 'personal',
    groupData: {
      groupName: '',
      participants: []
    },
    lendingData: {
      contactName: '',
      contactEmail: '',
      dueDate: ''
    }
  });
  
  const [filters] = useState<Filter>({
    accounts: [],
    categories: [],
    dateFrom: '',
    dateTo: '',
    tags: [],
    amountMin: undefined,
    amountMax: undefined,
    search: ''
  });

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 days', value: '7', days: 7 },
    { label: 'Last 30 days', value: '30', days: 30 },
    { label: 'Last 90 days', value: '90', days: 90 },
    { label: 'Last 6 months', value: '180', days: 180 },
    { label: 'Last year', value: '365', days: 365 },
    { label: 'All time', value: 'all', days: 0 },
  ];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchTransactions(), fetchSummary()]);
      } catch {
        showError('Failed to load data', 'Please try refreshing the page');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchTransactions, fetchSummary, showError]);

  // Filter transactions based on time range and filters
  const filteredTransactions = useMemo(() => {
    let transactions = state.transactions;

    // Apply time range filter
    if (selectedTimeRange !== 'all') {
      const days = parseInt(selectedTimeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      transactions = transactions.filter(t => new Date(t.date) >= cutoffDate);
    }

    // Apply custom filters
    return transactions.filter(transaction => {
      if (filters.accounts && filters.accounts.length > 0 && !filters.accounts.includes(transaction.account_id)) {
        return false;
      }
      
      if (filters.categories && filters.categories.length > 0 && transaction.category_id && !filters.categories.includes(transaction.category_id)) {
        return false;
      }
      
      if (filters.dateFrom && transaction.date < filters.dateFrom) {
        return false;
      }
      
      if (filters.dateTo && transaction.date > filters.dateTo) {
        return false;
      }
      
      if (filters.tags && filters.tags.length > 0 && !filters.tags.some(tag => transaction.tags.includes(tag))) {
        return false;
      }
      
      if (filters.amountMin !== undefined && Math.abs(parseFloat(transaction.amount)) < filters.amountMin) {
        return false;
      }
      
      if (filters.amountMax !== undefined && Math.abs(parseFloat(transaction.amount)) > filters.amountMax) {
        return false;
      }
      
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [state.transactions, selectedTimeRange, filters]);

  // Calculate analytics data with trends
  const analyticsData = useMemo((): AnalyticsData => {
    const income = filteredTransactions.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = filteredTransactions.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const incomeTransactions = filteredTransactions.filter(t => parseFloat(t.amount) > 0);
    const expenseTransactions = filteredTransactions.filter(t => parseFloat(t.amount) < 0);

    // Calculate category spending
    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(transaction => {
      if (transaction.category_id && parseFloat(transaction.amount) < 0) {
        // Find category name from categories list
        const category = state.categories.find(cat => cat.id === transaction.category_id);
        const categoryName = category?.name || 'Uncategorized';
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Math.abs(parseFloat(transaction.amount));
      }
    });

    const topCategoryEntry = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];
    
    // Calculate trends (compare to previous period)
    const currentPeriodDays = selectedTimeRange === 'all' ? 365 : parseInt(selectedTimeRange);
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (currentPeriodDays * 2));
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - currentPeriodDays);
    
    const previousTransactions = state.transactions.filter(t => {
      const date = new Date(t.date);
      return date >= previousStartDate && date <= previousEndDate;
    });
    
    const previousIncome = previousTransactions.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const previousExpenses = previousTransactions.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalTransactions: filteredTransactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      netFlow: income - expenses,
      avgTransaction: filteredTransactions.length > 0 ? 
        filteredTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) / filteredTransactions.length : 0,
      avgIncome: incomeTransactions.length > 0 ? income / incomeTransactions.length : 0,
      avgExpenses: expenseTransactions.length > 0 ? expenses / expenseTransactions.length : 0,
      topCategory: topCategoryEntry?.[0] || 'N/A',
      topCategoryAmount: topCategoryEntry?.[1] || 0,
      transactionTrend: calculateTrend(filteredTransactions.length, previousTransactions.length),
      incomeTrend: calculateTrend(income, previousIncome),
      expensesTrend: calculateTrend(expenses, previousExpenses),
    };
  }, [filteredTransactions, selectedTimeRange, state.transactions, state.categories]);

  // Enhanced chart data with better grouping
  const chartData = useMemo(() => {
    const groupBy = selectedTimeRange === '7' ? 'day' : 
                   selectedTimeRange === '30' || selectedTimeRange === '90' ? 'week' : 'month';
    
    const dataPoints: Record<string, { period: string; income: number; expenses: number; net: number; date: Date }> = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
      
      if (!dataPoints[key]) {
        dataPoints[key] = { period: key, income: 0, expenses: 0, net: 0, date };
      }
      
      const amount = parseFloat(transaction.amount);
      if (amount > 0) {
        dataPoints[key].income += amount;
      } else {
        dataPoints[key].expenses += Math.abs(amount);
      }
      dataPoints[key].net = dataPoints[key].income - dataPoints[key].expenses;
    });
    
    return Object.values(dataPoints).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredTransactions, selectedTimeRange]);

  // Enhanced category data
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, { amount: number; count: number; color: string }> = {};
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#FFB347', '#87CEEB', '#98D8C8', '#F7DC6F'
    ];
    
    filteredTransactions.forEach(transaction => {
      if (transaction.category_id && parseFloat(transaction.amount) < 0) {
        // Find category name from categories list
        const category = state.categories.find(cat => cat.id === transaction.category_id);
        const categoryName = category?.name || 'Uncategorized';
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { 
            amount: 0, 
            count: 0, 
            color: colors[Object.keys(categoryTotals).length % colors.length] 
          };
        }
        categoryTotals[categoryName].amount += Math.abs(parseFloat(transaction.amount));
        categoryTotals[categoryName].count += 1;
      }
    });
    
    return Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
        color: data.color,
        percentage: (data.amount / analyticsData.totalExpenses) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredTransactions, analyticsData.totalExpenses, state.categories]);

  const recentTransactions = useMemo(() => 
    state.transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5), 
    [state.transactions]
  );

  const goals = state.goals.slice(0, 3);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.accountId) return;

    try {
      await createTransaction({
        description: newTransaction.description,
        amount: newTransaction.amount,
        date: newTransaction.date,
        account_id: parseInt(newTransaction.accountId),
        category_id: newTransaction.categoryId || undefined,
        transaction_type: parseFloat(newTransaction.amount) >= 0 ? 'credit' : 'debit',
        verified: false,
        tags: [],
        notes: newTransaction.notes || ''
      });
      setShowAddTransaction(false);
      setNewTransaction({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        categoryId: '',
        notes: '',
        transactionType: 'personal',
        groupData: { groupName: '', participants: [] },
        lendingData: { contactName: '', contactEmail: '', dueDate: '' }
      });
      showSuccess('Transaction added successfully!');
    } catch {
      showError('Failed to add transaction');
    }
  };

  const handleExportReport = async (format: 'csv' | 'json' | 'excel' | 'pdf') => {
    try {
      setIsLoading(true);
      console.log('Starting export with format:', format);
      
      // Simplified filters for export
      const exportFilters = {
        dateFrom: selectedTimeRange !== 'all' ? 
          new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
          undefined,
        dateTo: undefined
      };
      
      console.log('Export filters:', exportFilters);
      
      const blob = await apiClient.exportTransactions(format, undefined, exportFilters);
      
      if (!blob || blob.size === 0) {
        throw new Error('Empty response from server');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-report-${selectedTimeRange}days-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Report Downloaded', `Your financial report has been downloaded in ${format.toUpperCase()} format`);
    } catch (error: unknown) {
      console.error('Export failed:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error)?.message || 'Unknown error occurred';
      showError('Export Failed', `Unable to generate report: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value), authState.user), '']} />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', r: 4 }} />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value), authState.user), '']} />
              <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value), authState.user), '']} />
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (state.loading.summary || state.loading.transactions) {
    return <LoadingSpinner />;
  }

  const summary = state.summary;
  
  if (!summary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Dashboard</h1>
          <p className="text-secondary-600 dark:text-secondary-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-secondary-100">
            {activeView === 'overview' ? 'Dashboard Overview' : 'Financial Analytics'}
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-2">
            {activeView === 'overview' ? 'Your financial overview at a glance' : 'Advanced insights into your financial data'}
          </p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'overview' ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'analytics' ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`}
            >
              Analytics
            </button>
          </div>

          {activeView === 'analytics' && (
            <Select
              options={timeRanges.map(range => ({ value: range.value, label: range.label }))}
              value={selectedTimeRange}
              onChange={(value) => setSelectedTimeRange(value as string)}
              className="w-48"
              placeholder="Select time range"
            />
          )}
          
          <Button
            onClick={() => setShowAddTransaction(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            disabled={isLoading}
            className="flex items-center space-x-2"
            variant="secondary"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {activeView === 'overview' ? (
        // Overview Mode - Traditional Dashboard
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Total Balance</p>
                  <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mt-1">
                    {formatCurrency(parseFloat(summary.account_balances?.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)?.toString() || '0') || 0, authState.user)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">This Month Income</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {formatCurrency(parseFloat(summary.total_income || '0'), authState.user)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">This Month Expenses</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {formatCurrency(Math.abs(parseFloat(summary.total_expenses || '0')), authState.user)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Net Flow</p>
                  <p className={`text-3xl font-bold mt-1 ${parseFloat(summary.net_amount || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(parseFloat(summary.net_amount || '0'), authState.user)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Account Balances, Charts, and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left column - Account Balances and Recent Transactions */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Account Balances</h3>
                  <button 
                    onClick={() => navigate('/accounts')}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                  >
                    Manage <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-4">
                  {state.accounts.slice(0, 4).map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          account.account_type === 'checking' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                          account.account_type === 'savings' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                          account.account_type === 'credit' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                          'bg-gray-100 dark:bg-gray-800 text-secondary-600 dark:text-secondary-400 dark:text-gray-400'
                        }`}>
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-secondary-900 dark:text-secondary-100">{account.name}</p>
                          <p className="text-sm text-secondary-500 dark:text-secondary-400 capitalize">{account.account_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${parseFloat(account.balance.toString()) >= 0 ? 'text-secondary-900 dark:text-secondary-100' : 'text-red-600'}`}>
                          {formatCurrency(parseFloat(account.balance.toString()), authState.user)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {state.accounts.length === 0 && (
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">No accounts added yet</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Recent Transactions</h3>
                  <button 
                    onClick={() => navigate('/transactions')}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                  >
                    View all <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-secondary-900 dark:text-secondary-100">{transaction.description}</p>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">{state.categories.find(cat => cat.id === transaction.category_id)?.name || 'Uncategorized'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${parseFloat(transaction.amount) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {formatCurrency(parseFloat(transaction.amount), authState.user)}
                        </p>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">{new Date(transaction.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right column - Chart and Goals */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Financial Trends</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                      {[
                        { type: 'bar', icon: BarChart3 },
                        { type: 'line', icon: TrendingUp },
                        { type: 'area', icon: PieChartIcon }
                      ].map(({ type, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => setChartType(type)}
                          className={`p-2 rounded-md transition-colors ${
                            chartType === type ? 'bg-white dark:bg-secondary-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:text-secondary-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {renderChart()}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Goals Progress</h3>
                  <button 
                    onClick={() => navigate('/goals')}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                  >
                    View all <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-secondary-900 dark:text-secondary-100">{goal.name}</p>
                        <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                          {Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%
                        </p>
                      </div>
                      <div className="w-full bg-secondary-100 dark:bg-secondary-800 rounded-full h-2.5">
                        <ProgressBar
                          percentage={Math.min((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100, 100)}
                          className="bg-primary-600 h-2.5 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                        <span>{formatCurrency(parseFloat(goal.current_amount), authState.user)}</span>
                        <span>{formatCurrency(parseFloat(goal.target_amount), authState.user)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        // Analytics Mode - Enhanced Analytics
        <>
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Total Transactions</p>
                  <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mt-1">{analyticsData.totalTransactions}</p>
                </div>
                <div className={`text-sm font-medium flex items-center ${analyticsData.transactionTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.transactionTrend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(analyticsData.transactionTrend).toFixed(1)}%
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Total Income</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(analyticsData.totalIncome, authState.user)}</p>
                </div>
                <div className={`text-sm font-medium flex items-center ${analyticsData.incomeTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.incomeTrend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(analyticsData.incomeTrend).toFixed(1)}%
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(analyticsData.totalExpenses, authState.user)}</p>
                </div>
                <div className={`text-sm font-medium flex items-center ${analyticsData.expensesTrend <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.expensesTrend <= 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}
                  {Math.abs(analyticsData.expensesTrend).toFixed(1)}%
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Net Flow</p>
                  <p className={`text-3xl font-bold mt-1 ${analyticsData.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analyticsData.netFlow, authState.user)}
                  </p>
                </div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">
                  Avg: {formatCurrency(analyticsData.avgTransaction, authState.user)}
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Chart */}
            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">Financial Trends</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                    {[
                      { type: 'bar', icon: BarChart3 },
                      { type: 'line', icon: TrendingUp },
                      { type: 'area', icon: PieChartIcon }
                    ].map(({ type, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`p-2 rounded-md transition-colors ${
                          chartType === type ? 'bg-white dark:bg-secondary-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:text-secondary-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {renderChart()}
            </Card>

            {/* Category Breakdown */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">Expense Categories</h3>
                <PieChartIcon className="h-6 w-6 text-purple-600" />
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (!midAngle || !percent || !cx || !cy || !innerRadius || !outerRadius) return null;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
                      const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
                      return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value), authState.user), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-3">
                {categoryData.slice(0, 6).map((category, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <ColoredCircle color={category.color} />
                      <span className="font-medium text-secondary-900 dark:text-secondary-100 truncate">{category.name}</span>
                    </div>
                    <span className="font-semibold text-secondary-900 dark:text-secondary-100">{formatCurrency(category.value, authState.user)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Insights & Export Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Insights */}
            <Card>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Key Insights</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PieChartIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 dark:text-secondary-100">Top spending category</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {analyticsData.topCategory} ({formatCurrency(analyticsData.topCategoryAmount, authState.user)})
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 dark:text-secondary-100">Average income per transaction</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {formatCurrency(analyticsData.avgIncome, authState.user)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 dark:text-secondary-100">Average expense per transaction</p>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {formatCurrency(analyticsData.avgExpenses, authState.user)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${analyticsData.netFlow >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                    <DollarSign className={`w-5 h-5 ${analyticsData.netFlow >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 dark:text-secondary-100">Financial health</p>
                    <p className={`text-sm ${analyticsData.netFlow >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {analyticsData.netFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Export Options */}
            <Card>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Export Reports</h3>
              <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-6">
                Download comprehensive financial reports in various formats.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { format: 'csv', icon: '📄', label: 'CSV Export' },
                  { format: 'excel', icon: '📊', label: 'Excel Report' },
                  { format: 'json', icon: '📋', label: 'JSON Data' },
                  { format: 'pdf', icon: '📕', label: 'PDF Report' }
                ].map(({ format, icon, label }) => (
                  <button
                    key={format}
                    onClick={() => handleExportReport(format as any)}
                    disabled={isLoading}
                    className="p-4 text-left border border-secondary-200 dark:border-secondary-700 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300 disabled:opacity-50 flex items-center space-x-4"
                  >
                    <div className="text-3xl">{icon}</div>
                    <div>
                      <div className="font-semibold text-secondary-900 dark:text-secondary-100">{label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      <FormModal
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        title="Add New Transaction"
        size="lg"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div>
            <label className="form-label">Description *</label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              placeholder="Enter transaction description"
              className="form-input"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="0.00"
                className="form-input"
                required
              />
            </div>
            
            <div>
              <label className="form-label mb-1">Date *</label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1">Account *</label>
              <select
                value={newTransaction.accountId}
                onChange={(e) => setNewTransaction({ ...newTransaction, accountId: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Select Account</option>
                {state.accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="form-label mb-1">Category</label>
              <select
                value={newTransaction.categoryId}
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
                className="form-input"
              >
                <option value="">Select Category</option>
                {state.categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label mb-1">Notes</label>
            <textarea
              value={newTransaction.notes}
              onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
              placeholder="Optional notes"
              rows={3}
              className="form-input"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowAddTransaction(false)}
              size="sm"
              variant="secondary"
            >
              Cancel
            </Button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </FormModal>

      <ToastContainer />
    </div>
  );
};