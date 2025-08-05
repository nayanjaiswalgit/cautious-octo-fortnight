import type { Account, Category, Transaction } from '../types';

export const mockAccounts: Account[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Main Checking',
    account_type: 'checking',
    balance: '2500.75',
    currency: 'USD',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    user_id: 1, 
    name: 'Savings Account',
    account_type: 'savings',
    balance: '15000.00',
    currency: 'USD',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    user_id: 1,
    name: 'Credit Card',
    account_type: 'credit_card',
    balance: '-1250.30',
    currency: 'USD',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockCategories: Category[] = [
  { id: '1', user_id: 1, name: 'Food & Dining', color: '#FF6B6B', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '2', user_id: 1, name: 'Transportation', color: '#4ECDC4', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', user_id: 1, name: 'Shopping', color: '#45B7D1', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '4', user_id: 1, name: 'Entertainment', color: '#96CEB4', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '5', user_id: 1, name: 'Bills & Utilities', color: '#FECA57', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '6', user_id: 1, name: 'Income', color: '#48CAE4', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '7', user_id: 1, name: 'Healthcare', color: '#F38BA8', is_system: false, created_at: '2024-01-01T00:00:00Z' },
  { id: '8', user_id: 1, name: 'Investment', color: '#A8DADC', is_system: false, created_at: '2024-01-01T00:00:00Z' }
];

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    user_id: 1,
    account_id: 1,
    category_id: '1',
    amount: '-85.32',
    description: 'Grocery Store',
    date: '2024-01-15',
    transaction_type: 'debit',
    verified: true,
    tags: ['grocery', 'food'],
    notes: '',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    user_id: 1,
    account_id: 1,
    category_id: '2',
    amount: '-45.00',
    description: 'Gas Station',
    date: '2024-01-14',
    transaction_type: 'debit',
    verified: true,
    tags: ['gas', 'transportation'],
    notes: '',
    created_at: '2024-01-14T00:00:00Z',
    updated_at: '2024-01-14T00:00:00Z'
  },
  {
    id: 3,
    user_id: 1,
    account_id: 1,
    category_id: '6',
    amount: '3000.00',
    description: 'Salary Deposit',
    date: '2024-01-13',
    transaction_type: 'credit',
    verified: true,
    tags: ['income', 'salary'],
    notes: '',
    created_at: '2024-01-13T00:00:00Z',
    updated_at: '2024-01-13T00:00:00Z'
  },
  {
    id: 4,
    user_id: 1,
    account_id: 2,
    amount: '-500.00',
    description: 'Transfer to Checking',
    date: '2024-01-12',
    transaction_type: 'debit',
    verified: true,
    tags: ['transfer'],
    notes: '',
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z'
  }
];