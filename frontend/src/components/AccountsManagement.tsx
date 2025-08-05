import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  Wallet,
  Building,
  Eye,
  EyeOff,
  ChevronDown,
  Upload as UploadIcon,
  FileText
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/preferences';
import { Modal } from './Modal';
import { Upload } from './Upload';
import { CurrencyField } from './CurrencyField';
import { MoreOptions } from './MoreOptions';
import { useCurrency } from '../hooks/useCurrency';
import { TagInput } from './TagInput';
import { useTags } from '../hooks/useTags';
import type { Account } from '../types';

interface AccountFormData {
  name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'credit_card' | 'investment' | 'wallet' | 'cash' | 'other';
  balance: string;
  currency: string;
  institution: string;
  account_number_last4: string;
  tags: string[];
}

const accountTypeIcons = {
  checking: Building,
  savings: PiggyBank,
  credit: CreditCard,
  credit_card: CreditCard,
  investment: TrendingUp,
  wallet: Wallet,
  cash: Wallet,
  other: Building
};

const accountTypeColors = {
  checking: 'bg-blue-100 text-blue-600',
  savings: 'bg-green-100 text-green-600',
  credit: 'bg-red-100 text-red-600',
  credit_card: 'bg-red-100 text-red-600',
  investment: 'bg-purple-100 text-purple-600',
  wallet: 'bg-orange-100 text-orange-600',
  cash: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-600'
};

export const AccountsManagement = () => {
  const { state, fetchAccounts, createAccount, updateAccount, deleteAccount } = useData();
  const { state: authState } = useAuth();
  const { getDefaultCurrency } = useCurrency();
  const { allTags, setEntityTags } = useTags();
  
  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    account_type: 'checking',
    balance: '0.00',
    currency: getDefaultCurrency(),
    institution: '',
    account_number_last4: '',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Statement filtering state
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);


  const accountTypes = [
    { value: 'checking', label: 'Checking Account', description: 'For everyday spending and bill payments' },
    { value: 'savings', label: 'Savings Account', description: 'For storing money and earning interest' },
    { value: 'credit', label: 'Credit Card', description: 'For credit-based spending' },
    { value: 'wallet', label: 'Digital Wallet', description: 'PayPal, Venmo, Apple Pay, etc.' },
    { value: 'cash', label: 'Cash', description: 'Physical cash on hand' },
    { value: 'investment', label: 'Investment Account', description: 'For stocks, bonds, and other investments' }
  ];

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const resetForm = () => {
    setFormData({
      name: '',
      account_type: 'checking',
      balance: '0.00',
      currency: getDefaultCurrency(),
      institution: '',
      account_number_last4: '',
      tags: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { tags: formTags, ...accountData } = formData;
      const finalAccountData = {
        ...accountData,
        is_active: true
      };

      let savedAccount;
      if (editingAccount) {
        savedAccount = await updateAccount(editingAccount.id, finalAccountData);
      } else {
        savedAccount = await createAccount(finalAccountData);
      }

      // Set tags for the account entity
      if (formTags.length > 0 && savedAccount?.id) {
        await setEntityTags(savedAccount.id.toString(), formTags);
      }

      resetForm();
      setShowAddModal(false);
      setEditingAccount(null);
      setShowAdvancedFields(false);
      await fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (account: Account) => {
    if (window.confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
      try {
        await deleteAccount(account.id);
        await fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const totalBalance = state.accounts.reduce((sum, account) => sum + parseFloat(account.balance.toString()), 0);
  const accountTypeGroups = state.accounts.reduce((groups, account) => {
    if (!groups[account.account_type]) {
      groups[account.account_type] = [];
    }
    groups[account.account_type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Accounts & Statements</h1>
            <p className="text-blue-100 text-lg">Manage your accounts and upload bank statements</p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                <span>{state.accounts.length} accounts</span>
              </div>
              {showBalances && (
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <span>Total: {formatCurrency(totalBalance, authState.user)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 lg:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              {showBalances ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showBalances ? 'Hide' : 'Show'} Balances
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </button>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="space-y-6">
          {/* Account Summary Cards - Now Clickable Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(accountTypeGroups).map(([type, accounts]) => {
              const Icon = accountTypeIcons[type as keyof typeof accountTypeIcons];
              const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);
              const isFiltered = selectedAccountFilter && accounts.some(acc => acc.id === selectedAccountFilter);
              
              return (
                <button
                  key={type}
                  onClick={() => {
                    // Toggle filter - if already filtered to this type, clear filter, otherwise set to first account of this type
                    if (isFiltered) {
                      setSelectedAccountFilter(null);
                    } else {
                      setSelectedAccountFilter(accounts[0]?.id || null);
                      setSelectedTagFilter(null); // Clear tag filter when account filter is applied
                    }
                  }}
                  className={`p-4 rounded-xl shadow-md text-left transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                    isFiltered 
                      ? `${accountTypeColors[type as keyof typeof accountTypeColors]} ring-2 ring-blue-500 shadow-lg` 
                      : `${accountTypeColors[type as keyof typeof accountTypeColors]} hover:opacity-90`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-semibold">{accounts.length}</span>
                  </div>
                  <h3 className="text-lg font-bold capitalize mb-1">{type.replace('_', ' ')}</h3>
                  {showBalances && (
                    <p className="text-xl font-bold">
                      {formatCurrency(total, authState.user)}
                    </p>
                  )}
                  {isFiltered && (
                    <p className="text-xs mt-1 opacity-75">Click to show all</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Accounts List */}
          <div className="theme-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold theme-text-primary">Your Accounts</h2>
                <p className="theme-text-secondary text-sm mt-1">
                  {selectedAccountFilter || selectedTagFilter
                    ? `Showing filtered accounts` 
                    : `Manage your ${state.accounts.length} financial accounts`}
                </p>
                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs text-gray-500 font-medium">Filter by tag:</span>
                    {allTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => {
                          if (selectedTagFilter === tag.name) {
                            setSelectedTagFilter(null);
                          } else {
                            setSelectedTagFilter(tag.name);
                            setSelectedAccountFilter(null); // Clear account filter when tag filter is applied
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          selectedTagFilter === tag.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name} ({tag.usage_count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {(selectedAccountFilter || selectedTagFilter) && (
                  <button
                    onClick={() => {
                      setSelectedAccountFilter(null);
                      setSelectedTagFilter(null);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            {state.loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : state.accounts.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-3">No accounts yet</h3>
                <p className="text-gray-600 mb-6">Add your first account to start tracking your finances</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-md"
                >
                  Add Your First Account
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.accounts
                  .filter(account => {
                    if (selectedAccountFilter && account.id !== selectedAccountFilter) return false;
                    if (selectedTagFilter && (!account.tags || !account.tags.includes(selectedTagFilter))) return false;
                    return true;
                  })
                  .map((account) => {
                  const Icon = accountTypeIcons[account.account_type];
                  
                  return (
                    <div key={account.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${accountTypeColors[account.account_type]}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold theme-text-primary">{account.name}</h3>
                            <div className="flex items-center space-x-3 text-sm theme-text-secondary">
                              <span className="capitalize">{account.account_type.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{account.currency}</span>
                              {account.institution && (
                                <>
                                  <span>•</span>
                                  <span>{account.institution}</span>
                                </>
                              )}
                              {account.account_number_last4 && (
                                <>
                                  <span>•</span>
                                  <span>****{account.account_number_last4}</span>
                                </>
                              )}
                            </div>
                            {account.tags && account.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {account.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {showBalances && (
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                parseFloat(account.balance.toString()) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(parseFloat(account.balance.toString()), authState.user)}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingAccount(account);
                                setFormData({
                                  name: account.name,
                                  account_type: account.account_type,
                                  balance: account.balance.toString(),
                                  currency: account.currency,
                                  institution: account.institution || '',
                                  account_number_last4: account.account_number_last4 || '',
                                  tags: account.tags || []
                                });
                                setShowAddModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                              title="Edit account"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(account)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                              title="Delete account"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        {/* Upload Statements Section */}
        <div className="theme-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold theme-text-primary flex items-center">
                  <UploadIcon className="w-6 h-6 mr-3 text-blue-600" />
                  Bank Statements
                </h2>
                <p className="theme-text-secondary text-sm mt-1">
                  Upload and manage your bank statements
                  {selectedAccountFilter && ` for ${state.accounts.find(acc => acc.id === selectedAccountFilter)?.name}`}
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Statement
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium theme-text-primary mb-2">No statements uploaded yet</h3>
              <p className="theme-text-secondary mb-4">
                Upload your bank statements to automatically import transactions
              </p>
              <p className="text-xs theme-text-muted">
                Supports PDF bank statements, CSV, and JSON files
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Bank Statements"
        size="xl"
      >
        <Upload />
      </Modal>

      {/* Add/Edit Account Modal */}
      <Modal
        isOpen={showAddModal}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        onClose={() => {
          setShowAddModal(false);
          setEditingAccount(null);
          resetForm();
          setShowAdvancedFields(false);
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="theme-form-label mb-2">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="theme-input"
              placeholder="e.g., Chase Checking, Savings Account"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="theme-form-label mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                className="theme-input"
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div>
            <label className="theme-form-label mb-2">
              Initial Balance <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              className="theme-input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="theme-form-label mb-2">
              Tags
            </label>
            <TagInput
              tags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              suggestions={allTags.map(tag => tag.name)}
              placeholder="Add tags (e.g., personal, business, savings...)"
              maxTags={10}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tags help you organize and filter your accounts
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="flex items-center text-sm theme-text-secondary hover:theme-text-primary font-medium transition-colors"
            >
              <ChevronDown className={`w-5 h-5 mr-1 transition-transform ${showAdvancedFields ? 'rotate-180' : ''}`} />
              More Options (Currency, Institution, etc.)
            </button>
          </div>

          {showAdvancedFields && (
            <MoreOptions title="Advanced Options" defaultOpen={true} className="pt-0">
              <CurrencyField
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                required
                label="Currency"
              />
              
              <div>
                <label className="theme-form-label">
                  Institution
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="theme-input"
                  placeholder="e.g., Chase Bank, Wells Fargo"
                />
              </div>

              <div>
                <label className="theme-form-label">
                  Account Number (Last 4 digits)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.account_number_last4}
                  onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value.replace(/\D/g, '') })}
                  className="theme-input"
                  placeholder="1234"
                />
              </div>
            </MoreOptions>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingAccount(null);
                resetForm();
                setShowAdvancedFields(false);
              }}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
            >
              {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};