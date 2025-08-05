import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Users, 
  Settings, 
  MoreVertical, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  HandHeart,
  User,
  Calendar,
  ChevronDown,
  X
} from 'lucide-react';
import { apiClient } from '../api/client';
import { FormModal } from './FormModal';
import { ProgressBar } from './ProgressBar';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/preferences';
import { Button } from './Button';
import type { Contact, Account, LendingTransaction } from '../types';

interface Group {
  id: number;
  name: string;
  description: string;
  members: Contact[];
  balance: number;
  totalExpenses: number;
  recentActivity: string;
}

interface ContactBalance {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  totalLent: number;
  totalBorrowed: number;
  netBalance: number;
  lastActivity: string;
  transactionCount: number;
}


export const SocialFinance: React.FC = () => {
  const { state: authState } = useAuth();
  const { showSuccess, showError, ToastContainer } = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'groups' | 'lending'>('groups');
  
  // Shared state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  
  // Group expenses state
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  
  // Lending state
  const [lendingTransactions, setLendingTransactions] = useState<LendingTransaction[]>([]);
  const [contactBalances, setContactBalances] = useState<ContactBalance[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactBalance | null>(null);
  const [contactTransactions, setContactTransactions] = useState<LendingTransaction[]>([]);
  const [showCreateLendingModal, setShowCreateLendingModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LendingTransaction | null>(null);

  // Form states
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    members: [] as number[]
  });


  const [newLendingTransaction, setNewLendingTransaction] = useState({
    contact: '',
    account: '',
    transaction_type: 'lent' as 'lent' | 'borrowed',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [repaymentData, setRepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Receipt upload state

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setActiveDropdown(null);
      // Close member dropdown if clicked outside
      const target = event.target as Element;
      if (!target.closest('.member-dropdown')) {
        setShowMemberDropdown(false);
      }
    };
    
    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]);

  const loadData = async () => {
    try {
      console.log('Loading social finance data...');
      
      // Load each API call separately to identify which one fails
      const contactsData = await apiClient.getContacts().catch(err => {
        console.error('Failed to load contacts:', err);
        throw new Error(`Failed to load contacts: ${err?.message || String(err)}`);
      });
      console.log('Contacts loaded:', contactsData.length);
      
      const accountsData = await apiClient.getAccounts().catch(err => {
        console.error('Failed to load accounts:', err);
        throw new Error(`Failed to load accounts: ${err?.message || String(err)}`);
      });
      console.log('Accounts loaded:', accountsData.length);
      
      const groupExpensesData = await apiClient.getGroupExpenses().catch(err => {
        console.error('Failed to load group expenses:', err);
        throw new Error(`Failed to load group expenses: ${err?.message || String(err)}`);
      });
      console.log('Group expenses loaded:', groupExpensesData.length);
      
      const lendingData = await apiClient.getLendingTransactions().catch(err => {
        console.error('Failed to load lending transactions:', err);
        throw new Error(`Failed to load lending transactions: ${err?.message || String(err)}`);
      });
      console.log('Lending transactions loaded:', lendingData.length);
      
      const summaryData = await apiClient.getLendingSummary().catch(err => {
        console.error('Failed to load lending summary:', err);
        return null; // This one can fail gracefully
      });
      console.log('Summary loaded:', summaryData);
      
      setContacts(contactsData);
      setAccounts(accountsData);
      setLendingTransactions(lendingData);
      
      // Transform group expenses data
      const groupsMap = new Map<string, Group>();
      groupExpensesData.forEach(expense => {
        if (!groupsMap.has(expense.title)) {
          groupsMap.set(expense.title, {
            id: expense.id,
            name: expense.title,
            description: expense.description || '',
            members: [],
            balance: 0,
            totalExpenses: 0,
            recentActivity: new Date(expense.date).toLocaleDateString()
          });
        }
        const group = groupsMap.get(expense.title)!;
        group.totalExpenses += parseFloat(expense.total_amount);
      });
      
      setGroups(Array.from(groupsMap.values()));

      // Process lending transactions to create contact balances
      const contactMap = new Map<number, ContactBalance>();
      
      contactsData.forEach(contact => {
        contactMap.set(contact.id, {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          totalLent: 0,
          totalBorrowed: 0,
          netBalance: 0,
          lastActivity: 'Never',
          transactionCount: 0
        });
      });

      lendingData.forEach(transaction => {
        const contactId = transaction.contact;
        const contactBalance = contactMap.get(contactId);
        if (!contactBalance) return;

        const amount = parseFloat(transaction.amount);
        if (transaction.transaction_type === 'lent') {
          contactBalance.totalLent += amount;
          contactBalance.netBalance += transaction.remaining_amount;
        } else {
          contactBalance.totalBorrowed += amount;
          contactBalance.netBalance -= transaction.remaining_amount;
        }

        contactBalance.transactionCount++;
        contactBalance.lastActivity = new Date(transaction.date).toLocaleDateString();
      });

      setContactBalances(Array.from(contactMap.values()).filter(cb => cb.transactionCount > 0));
    } catch (error: any) {
      console.error('Failed to load data:', error);
      const errorMessage = error?.message || error?.response?.data?.detail || 'Unknown error occurred';
      showError('Failed to load data', `Error: ${errorMessage}. Please try refreshing the page`);
    } finally {
      setLoading(false);
    }
  };

  const loadContactTransactions = async (contactId: number) => {
    try {
      const allTransactions = await apiClient.getLendingTransactions();
      const filtered = allTransactions.filter(t => t.contact === contactId);
      setContactTransactions(filtered);
    } catch (error) {
      console.error('Failed to load contact transactions:', error);
      showError('Failed to load transactions', 'Please try again');
    }
  };

  const handleContactSelect = async (contact: ContactBalance) => {
    setSelectedContact(contact);
    await loadContactTransactions(contact.id);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) {
      showError('Name Required', 'Please enter a contact name');
      return;
    }

    try {
      const contact = await apiClient.createContact(newContact);
      setContacts(prev => [...prev, contact]);
      setNewContact({ name: '', email: '', phone: '' });
      setShowCreateContactModal(false);
      showSuccess('Contact Added', `${contact.name} has been added successfully`);
    } catch (error) {
      showError('Failed to add contact', 'Please try again');
    }
  };

  // Memoized handlers to prevent modal flickering
  const handleGroupNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handleGroupDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewGroup(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handleMemberSelect = useCallback((contactId: number) => {
    setNewGroup(prev => ({
      ...prev,
      members: prev.members.includes(contactId)
        ? prev.members.filter(id => id !== contactId)
        : [...prev.members, contactId]
    }));
  }, []);


  const handleRemoveMember = useCallback((contactId: number) => {
    setNewGroup(prev => ({
      ...prev,
      members: prev.members.filter(id => id !== contactId)
    }));
  }, []);

  // Get selected contacts for display
  const selectedContacts = useMemo(() => 
    contacts.filter(contact => newGroup.members.includes(contact.id)),
    [contacts, newGroup.members]
  );

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      showError('Group Name Required', 'Please enter a group name');
      return;
    }

    try {
      // Create an initial GroupExpense to establish the group
      // This ensures the group persists and will reload properly
      if (!accounts.length) {
        showError('No Account Found', 'Please add an account first to create a group');
        return;
      }

      const initialExpenseData = {
        account: accounts[0].id, // Use first available account
        title: newGroup.name,
        description: newGroup.description || `Initial setup for ${newGroup.name} group`,
        total_amount: '0.01', // Minimal amount to create the group
        currency: authState.user?.preferred_currency || 'USD',
        date: new Date().toISOString().split('T')[0],
        paid_by: Number(authState.user?.id) || 1,
        status: 'active' as const,
        notes: 'Group creation - initial placeholder expense'
      };

      await apiClient.createGroupExpense(initialExpenseData);
      
      // Reload data to reflect the new group
      await loadData();
      
      setNewGroup({ name: '', description: '', members: [] });
      setShowCreateGroupModal(false);
      setShowMemberDropdown(false);
      showSuccess('Group Created', `${newGroup.name} has been created successfully`);
    } catch (error) {
      console.error('Failed to create group:', error);
      showError('Failed to create group', 'Please try again');
    }
  };

  const handleCreateLendingTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLendingTransaction.contact || !newLendingTransaction.account || !newLendingTransaction.amount || !newLendingTransaction.description.trim()) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      await apiClient.createLendingTransaction({
        ...newLendingTransaction,
        contact: parseInt(newLendingTransaction.contact),
        account: parseInt(newLendingTransaction.account),
        date: new Date(newLendingTransaction.date).toISOString(),
        currency: 'USD',
        repaid_amount: '0.00',
        status: 'active'
      });
      
      setNewLendingTransaction({
        contact: '',
        account: '',
        transaction_type: 'lent',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowCreateLendingModal(false);
      
      await loadData();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }
      
      showSuccess('Transaction Added', 'Lending transaction has been recorded successfully');
    } catch (error) {
      showError('Failed to create transaction', 'Please try again');
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction || !repaymentData.amount) {
      showError('Missing Information', 'Please enter repayment amount');
      return;
    }

    try {
      await apiClient.recordLendingRepayment(
        selectedTransaction.id,
        repaymentData.amount,
        repaymentData.date,
        repaymentData.notes
      );
      
      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowRepaymentModal(false);
      setSelectedTransaction(null);
      
      await loadData();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }
      
      showSuccess('Repayment Recorded', 'Payment has been recorded successfully');
    } catch (error) {
      showError('Failed to record repayment', 'Please try again');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-yellow-100 text-yellow-800',
      partially_repaid: 'bg-blue-100 text-blue-800',
      fully_repaid: 'bg-green-100 text-green-800',
      written_off: 'bg-red-100 text-red-800'
    };
    
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };



  return loading ? (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ) : (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">🤝 Social Finance</h1>
            <p className="text-purple-100 text-lg">Manage group expenses and personal lending</p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                <span>{groups.length} groups</span>
              </div>
              <div className="flex items-center">
                <HandHeart className="w-5 h-5 mr-2" />
                <span>{contactBalances.length} lending contacts</span>
              </div>
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                <span>{contacts.length} total contacts</span>
              </div>
            </div>
          </div>
          <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowCreateContactModal(true)}
              variant="ghost-white"
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <Button
              onClick={() => activeTab === 'groups' ? setShowCreateGroupModal(true) : setShowCreateLendingModal(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'groups' ? 'Create Group' : 'Add Transaction'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <Button
            onClick={() => setActiveTab('groups')}
            variant={activeTab === 'groups' ? 'primary' : 'ghost'}
            className="py-4 px-1 border-b-2 font-medium text-sm"
          >
            <Users className="w-5 h-5 inline mr-2" />
            Group Expenses ({groups.length})
          </Button>
          <Button
            onClick={() => setActiveTab('lending')}
            variant={activeTab === 'lending' ? 'primary' : 'ghost'}
            className="py-4 px-1 border-b-2 font-medium text-sm"
          >
            <HandHeart className="w-5 h-5 inline mr-2" />
            Lending & Borrowing ({lendingTransactions.length})
          </Button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Groups Grid */}
          {groups.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium theme-text-primary mb-2">No groups yet</h3>
              <p className="theme-text-secondary mb-6">Create your first group to start splitting expenses</p>
              <Button
                onClick={() => setShowCreateGroupModal(true)}
                variant="primary"
                size="lg"
              >
                Create Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 truncate">{group.name}</h3>
                    <div className="relative">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === group.id ? null : group.id);
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                      
                      {activeDropdown === group.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1">
                          <button
                            onClick={() => {
                              setActiveDropdown(null);
                              showError('Add Expense feature temporarily disabled');
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                          </button>
                          <button
                            onClick={() => {
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Group
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="theme-text-secondary text-sm mb-4">{group.description || 'No description'}</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm theme-text-secondary">Total Expenses</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(group.totalExpenses, authState.user)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm theme-text-secondary">Your Balance</span>
                      <span className={`font-semibold text-lg ${group.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {group.balance >= 0 ? '+' : ''}{formatCurrency(group.balance, authState.user)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm theme-text-secondary">Members</span>
                      <span className="text-sm text-gray-800">{group.members.length} people</span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-4">
                      <span className="text-xs theme-text-muted">Last activity: {group.recentActivity}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      showError('Add Expense feature temporarily disabled');
                    }}
                    className="w-full mt-6"
                    variant="secondary"
                  >
                    Add Expense
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lending' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contact List - Khata Book Style */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                  Lending Contacts
                </h2>
                <p className="theme-text-secondary text-sm mt-1">Click on a person to view their transactions</p>
              </div>
              <div className="divide-y divide-gray-200">
                {contactBalances.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <HandHeart className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium theme-text-primary mb-2">No lending contacts yet</h3>
                    <p className="theme-text-secondary mb-4">Add a contact and create your first lending transaction</p>
                    <Button
                      onClick={() => setShowCreateContactModal(true)}
                      variant="link"
                    >
                      Add your first contact
                    </Button>
                  </div>
                ) : (
                  contactBalances.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactSelect(contact)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id ? 'bg-pink-50 border-r-4 border-pink-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg ${
                            contact.netBalance > 0 ? 'bg-green-500' : contact.netBalance < 0 ? 'bg-red-500' : 'bg-gray-500'
                          }`}>
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{contact.name}</h3>
                            <p className="text-sm theme-text-secondary">{contact.transactionCount} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${
                            contact.netBalance > 0 ? 'text-green-600' : contact.netBalance < 0 ? 'text-red-600' : 'theme-text-secondary'
                          }`}>
                            {contact.netBalance > 0 && '+'}
                            {formatCurrency(Math.abs(contact.netBalance), authState.user)}
                          </div>
                          <div className="text-xs theme-text-muted">
                            {contact.netBalance > 0 ? 'Owes you' : contact.netBalance < 0 ? 'You owe' : 'Settled'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="lg:col-span-3">
            {selectedContact ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          selectedContact.netBalance > 0 ? 'bg-green-500' : selectedContact.netBalance < 0 ? 'bg-red-500' : 'bg-gray-500'
                        }`}></div>
                        {selectedContact.name}
                      </h2>
                      <p className="theme-text-secondary mt-1">Transaction history and balance</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        selectedContact.netBalance > 0 ? 'text-green-600' : selectedContact.netBalance < 0 ? 'text-red-600' : 'theme-text-secondary'
                      }`}>
                        {selectedContact.netBalance > 0 && '+'}
                        {formatCurrency(Math.abs(selectedContact.netBalance), authState.user)}
                      </div>
                      <div className="text-sm theme-text-secondary">
                        {selectedContact.netBalance > 0 ? 'They owe you' : selectedContact.netBalance < 0 ? 'You owe them' : 'All settled'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedContact.totalLent, authState.user)}</div>
                      <div className="text-sm theme-text-secondary">You lent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(selectedContact.totalBorrowed, authState.user)}</div>
                      <div className="text-sm theme-text-secondary">You borrowed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-medium theme-text-secondary">{selectedContact.transactionCount}</div>
                      <div className="text-sm theme-text-secondary">Total transactions</div>
                    </div>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {contactTransactions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="theme-text-secondary text-lg">No transactions found</p>
                    </div>
                  ) : (
                    contactTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              transaction.transaction_type === 'lent' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {transaction.transaction_type === 'lent' ? (
                                <ArrowUpRight className="w-6 h-6" />
                              ) : (
                                <ArrowDownLeft className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800">{transaction.description}</h4>
                              <div className="flex items-center space-x-3 text-sm theme-text-secondary">
                                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                                  {transaction.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${
                              transaction.transaction_type === 'lent' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(parseFloat(transaction.amount), authState.user)}
                            </div>
                            <div className="text-sm theme-text-muted mt-1">
                              {transaction.remaining_amount > 0 && transaction.status !== 'written_off' && (
                                <>
                                  <span className="text-orange-600 font-medium">
                                    {formatCurrency(transaction.remaining_amount, authState.user)} pending
                                  </span>
                                  {!transaction.is_fully_repaid && (
                                    <Button
                                      onClick={() => {
                                        setSelectedTransaction(transaction);
                                        setRepaymentData(prev => ({
                                          ...prev,
                                          amount: transaction.remaining_amount.toString()
                                        }));
                                        setShowRepaymentModal(true);
                                      }}
                                      variant="link"
                                      size="sm"
                                    >
                                      Record Payment
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Repayment Progress */}
                        {!transaction.is_fully_repaid && transaction.status !== 'written_off' && (
                          <div className="mt-3 pl-16">
                            <div className="flex justify-between text-sm theme-text-secondary mb-1">
                              <span>Repayment Progress</span>
                              <span>{transaction.repayment_percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <ProgressBar percentage={transaction.repayment_percentage} className="bg-blue-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                <div className="bg-pink-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Eye className="w-10 h-10 text-pink-600" />
                </div>
                <h3 className="text-xl font-medium theme-text-primary mb-2">Select a contact to view transactions</h3>
                <p className="theme-text-secondary text-lg">Choose a person from the left to see their lending history and current balance</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Contact Modal */}
      <FormModal
        isOpen={showCreateContactModal}
        onClose={() => setShowCreateContactModal(false)}
        title="Add New Contact"
      >
        <form onSubmit={handleCreateContact} className="space-y-5 p-6">
          <Input
            label="Name"
            type="text"
            value={newContact.name}
            onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Contact name"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contact@example.com"
          />
          
          <Input
            label="Phone"
            type="tel"
            value={newContact.phone}
            onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 (555) 123-4567"
          />
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => setShowCreateContactModal(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Contact
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Create Group Modal */}
      <FormModal
        isOpen={showCreateGroupModal}
        onClose={() => {
          setShowCreateGroupModal(false);
          setShowMemberDropdown(false);
        }}
        title="Create New Group"
        size="lg"
      >
        <form onSubmit={handleCreateGroup} className="space-y-5 p-6">
          <Input
            label="Group Name"
            type="text"
            value={newGroup.name}
            onChange={handleGroupNameChange}
            placeholder="e.g., Weekend Trip, Office Lunch, Shared Apartment"
            required
          />
          
          <Input
            label="Description"
            value={newGroup.description}
            onChange={handleGroupDescriptionChange}
            placeholder="Optional description of what this group is for"
            multiline
            rows={3}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
            
            {/* Dropdown for selecting members */}
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
            
            {/* Dropdown for selecting members */}
            <div className="relative member-dropdown">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMemberDropdown(!showMemberDropdown);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 text-left flex items-center justify-between focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              >
                <span className="text-gray-700">
                  {selectedContacts.length > 0 
                    ? `${selectedContacts.length} member${selectedContacts.length > 1 ? 's' : ''} selected`
                    : 'Select members...'
                  }
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showMemberDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showMemberDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1">
                  {contacts.length > 0 ? (
                    contacts.map(contact => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMemberSelect(contact.id);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                          newGroup.members.includes(contact.id) ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          {contact.email && (
                            <div className="text-xs theme-text-muted">{contact.email}</div>
                          )}
                        </div>
                        {newGroup.members.includes(contact.id) && (
                          <div className="h-5 w-5 bg-purple-600 rounded-full flex items-center justify-center">
                            <div className="h-2.5 w-2.5 bg-white dark:bg-gray-800 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm theme-text-muted italic">
                      No contacts available. Add contacts first to include them in groups.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected members display */}
            {selectedContacts.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected Members:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
                    >
                      <span>{contact.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(contact.id)}
                        className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => {
                setShowCreateGroupModal(false);
                setShowMemberDropdown(false);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Group
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Create Lending Transaction Modal */}
      <FormModal
        isOpen={showCreateLendingModal}
        onClose={() => setShowCreateLendingModal(false)}
        title="Add Lending Transaction"
        size="lg"
      >
        <form onSubmit={handleCreateLendingTransaction} className="space-y-5 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={() => setNewLendingTransaction(prev => ({ ...prev, transaction_type: 'lent' }))}
                variant={newLendingTransaction.transaction_type === 'lent' ? 'primary' : 'secondary'}
                className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <ArrowUpRight className="w-6 h-6 mr-3" />
                  <span className="font-semibold text-lg text-gray-800">Money Lent</span>
                </div>
                <p className="text-sm theme-text-secondary">You gave money to someone</p>
              </Button>
              <Button
                type="button"
                onClick={() => setNewLendingTransaction(prev => ({ ...prev, transaction_type: 'borrowed' }))}
                variant={newLendingTransaction.transaction_type === 'borrowed' ? 'primary' : 'secondary'}
                className="p-4 border-2 rounded-lg text-left transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <ArrowDownLeft className="w-6 h-6 mr-3" />
                  <span className="font-semibold text-lg text-gray-800">Money Borrowed</span>
                </div>
                <p className="text-sm theme-text-secondary">You received money from someone</p>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Select
                label="Contact"
                value={newLendingTransaction.contact}
                onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, contact: e.target.value }))}
                options={contacts.map((contact) => ({ value: contact.id, label: contact.name }))}
                required
              />
            </div>

            <div>
              <Select
                label="Account"
                value={newLendingTransaction.account}
                onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, account: e.target.value }))}
                options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                required
              />
            </div>
          </div>

          <Input
            label="Description"
            type="text"
            value={newLendingTransaction.description}
            onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Lunch money, Emergency loan, Trip expenses"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={newLendingTransaction.amount}
                onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
                icon={DollarSign}
              />
            </div>

            <div>
              <Input
                label="Date"
                type="date"
                value={newLendingTransaction.date}
                onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Notes"
              value={newLendingTransaction.notes}
              onChange={(e) => setNewLendingTransaction(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
              placeholder="Additional details about this transaction..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => setShowCreateLendingModal(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Transaction
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Record Repayment Modal */}
      <FormModal
        isOpen={showRepaymentModal}
        onClose={() => setShowRepaymentModal(false)}
        title="Record Repayment"
      >
        {selectedTransaction && (
          <form onSubmit={handleRecordRepayment} className="space-y-5 p-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg theme-text-primary">{selectedTransaction.contact_name}</h3>
              <p className="text-sm theme-text-secondary">{selectedTransaction.description}</p>
              <p className="text-sm theme-text-muted mt-1">
                Remaining: <span className="font-medium text-blue-600">{formatCurrency(selectedTransaction.remaining_amount, authState.user)}</span>
              </p>
            </div>

            <div>
              <Input
                label="Repayment Amount"
                type="number"
                step="0.01"
                value={repaymentData.amount}
                onChange={(e) => setRepaymentData(prev => ({ ...prev, amount: e.target.value }))}
                max={selectedTransaction.remaining_amount}
                placeholder="0.00"
                required
                icon={DollarSign}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={repaymentData.date}
                onChange={(e) => setRepaymentData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={repaymentData.notes}
                onChange={(e) => setRepaymentData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                rows={3}
                placeholder="Payment method, additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowRepaymentModal(false)}
                className="px-6 py-3 theme-text-secondary hover:text-gray-800 transition-colors font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                Record Payment
              </button>
            </div>
          </form>
        )}
      </FormModal>

      <ToastContainer />
    </div>
  );
};