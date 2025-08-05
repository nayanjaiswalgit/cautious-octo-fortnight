import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { Account, Category, Transaction, Goal, Summary, Filter } from '../types';
import { apiClient } from '../api/client';

interface DataState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  summary: Summary | null;
  loading: {
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
    goals: boolean;
    summary: boolean;
  };
  error: string | null;
  totalTransactions: number;
  currentFilters: Partial<Filter>;
}

type DataAction =
  | { type: 'SET_LOADING'; payload: { key: keyof DataState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_TRANSACTIONS'; payload: { transactions: Transaction[]; total: number } }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'SET_SUMMARY'; payload: Summary }
  | { type: 'SET_FILTERS'; payload: Partial<Filter> }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: number }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: number }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: number }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: number };

const initialState: DataState = {
  accounts: [],
  categories: [],
  transactions: [],
  goals: [],
  summary: null,
  loading: {
    accounts: false,
    categories: false,
    transactions: false,
    goals: false,
    summary: false,
  },
  error: null,
  totalTransactions: 0,
  currentFilters: {},
};

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_TRANSACTIONS':
      return { 
        ...state, 
        transactions: action.payload.transactions,
        totalTransactions: action.payload.total
      };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    case 'SET_FILTERS':
      return { ...state, currentFilters: action.payload };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(acc => 
          acc.id === action.payload.id ? action.payload : acc
        )
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(acc => acc.id !== action.payload)
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat => 
          cat.id === action.payload.id ? action.payload : cat
        )
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.payload.toString())
      };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map(goal => 
          goal.id === action.payload.id ? action.payload : goal
        )
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter(goal => goal.id !== action.payload)
      };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(txn => 
          txn.id === action.payload.id ? action.payload : txn
        )
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(txn => txn.id !== action.payload),
        totalTransactions: state.totalTransactions - 1
      };
    default:
      return state;
  }
}

interface DataContextType {
  state: DataState;
  // Accounts
  fetchAccounts: () => Promise<void>;
  createAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Account>;
  updateAccount: (id: number, account: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: number) => Promise<void>;
  // Categories
  fetchCategories: () => Promise<void>;
  createCategory: (category: Omit<Category, 'id' | 'user_id' | 'created_at'>) => Promise<Category>;
  updateCategory: (id: number, category: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  // Goals
  fetchGoals: () => Promise<void>;
  createGoal: (goal: Omit<Goal, 'id' | 'progress_percentage' | 'remaining_amount' | 'is_completed' | 'created_at' | 'updated_at'>) => Promise<Goal>;
  updateGoal: (id: number, goal: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: number) => Promise<void>;
  updateGoalProgress: (id: number, amount: number) => Promise<Goal>;
  toggleGoalStatus: (id: number, status: 'active' | 'paused' | 'cancelled') => Promise<Goal>;
  // Transactions
  fetchTransactions: (filters?: Partial<Filter>) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Transaction>;
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;
  updateTransactionSplits: (id: number, splits: any[]) => Promise<Transaction>;
  bulkUpdateTransactionAccount: (transactionIds: number[], accountId: number) => Promise<{ updated_count: number; account_name: string }>;
  // Summary
  fetchSummary: (filters?: Partial<Filter>) => Promise<void>;
  // Filters
  setFilters: (filters: Partial<Filter>) => void;
  clearError: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  const setLoading = useCallback((key: keyof DataState['loading'], value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // Accounts
  const fetchAccounts = useCallback(async () => {
    setLoading('accounts', true);
    try {
      const accounts = await apiClient.getAccounts();
      dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch accounts');
    } finally {
      setLoading('accounts', false);
    }
  }, [setLoading, setError]);

  const createAccount = useCallback(async (accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const account = await apiClient.createAccount(accountData);
      dispatch({ type: 'ADD_ACCOUNT', payload: account });
      return account;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create account');
      throw error;
    }
  }, [setError]);

  const updateAccount = useCallback(async (id: number, accountData: Partial<Account>) => {
    try {
      const account = await apiClient.updateAccount(id, accountData);
      dispatch({ type: 'UPDATE_ACCOUNT', payload: account });
      return account;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update account');
      throw error;
    }
  }, [setError]);

  const deleteAccount = useCallback(async (id: number) => {
    try {
      await apiClient.deleteAccount(id);
      dispatch({ type: 'DELETE_ACCOUNT', payload: id });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete account');
      throw error;
    }
  }, [setError]);

  // Categories
  const fetchCategories = useCallback(async () => {
    setLoading('categories', true);
    try {
      const categories = await apiClient.getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch categories');
    } finally {
      setLoading('categories', false);
    }
  }, [setLoading, setError]);

  const createCategory = useCallback(async (categoryData: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const category = await apiClient.createCategory(categoryData);
      dispatch({ type: 'ADD_CATEGORY', payload: category });
      return category;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create category');
      throw error;
    }
  }, [setError]);

  const updateCategory = useCallback(async (id: number, categoryData: Partial<Category>) => {
    try {
      const category = await apiClient.updateCategory(id, categoryData);
      dispatch({ type: 'UPDATE_CATEGORY', payload: category });
      return category;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update category');
      throw error;
    }
  }, [setError]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      await apiClient.deleteCategory(id);
      dispatch({ type: 'DELETE_CATEGORY', payload: id });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete category');
      throw error;
    }
  }, [setError]);

  // Goals
  const fetchGoals = useCallback(async () => {
    setLoading('goals', true);
    try {
      const goals = await apiClient.getGoals();
      dispatch({ type: 'SET_GOALS', payload: goals });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch goals');
    } finally {
      setLoading('goals', false);
    }
  }, [setLoading, setError]);

  const createGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'progress_percentage' | 'remaining_amount' | 'is_completed' | 'created_at' | 'updated_at'>) => {
    try {
      const goal = await apiClient.createGoal(goalData);
      dispatch({ type: 'ADD_GOAL', payload: goal });
      return goal;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create goal');
      throw error;
    }
  }, [setError]);

  const updateGoal = useCallback(async (id: number, goalData: Partial<Goal>) => {
    try {
      const goal = await apiClient.updateGoal(id, goalData);
      dispatch({ type: 'UPDATE_GOAL', payload: goal });
      return goal;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update goal');
      throw error;
    }
  }, [setError]);

  const deleteGoal = useCallback(async (id: number) => {
    try {
      await apiClient.deleteGoal(id);
      dispatch({ type: 'DELETE_GOAL', payload: id });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete goal');
      throw error;
    }
  }, [setError]);

  const updateGoalProgress = useCallback(async (id: number, amount: number) => {
    try {
      const goal = await apiClient.updateGoalProgress(id, amount);
      dispatch({ type: 'UPDATE_GOAL', payload: goal });
      return goal;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update goal progress');
      throw error;
    }
  }, [setError]);

  const toggleGoalStatus = useCallback(async (id: number, status: 'active' | 'paused' | 'cancelled') => {
    try {
      const goal = await apiClient.toggleGoalStatus(id, status);
      dispatch({ type: 'UPDATE_GOAL', payload: goal });
      return goal;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to toggle goal status');
      throw error;
    }
  }, [setError]);

  // Transactions
  const fetchTransactions = useCallback(async (filters?: Partial<Filter>) => {
    setLoading('transactions', true);
    try {
      const response = await apiClient.getTransactions(filters);
      dispatch({ 
        type: 'SET_TRANSACTIONS', 
        payload: { 
          transactions: Array.isArray(response) ? response : response.results, 
          total: Array.isArray(response) ? response.length : response.count 
        } 
      });
      if (filters) {
        dispatch({ type: 'SET_FILTERS', payload: filters });
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch transactions');
    } finally {
      setLoading('transactions', false);
    }
  }, [setLoading, setError]);

  const createTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const transaction = await apiClient.createTransaction(transactionData);
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create transaction');
      throw error;
    }
  }, [setError]);

  const updateTransaction = useCallback(async (id: number, transactionData: Partial<Transaction>) => {
    try {
      const transaction = await apiClient.updateTransaction(id, transactionData);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update transaction');
      throw error;
    }
  }, [setError]);

  const deleteTransaction = useCallback(async (id: number) => {
    try {
      await apiClient.deleteTransaction(id);
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete transaction');
      throw error;
    }
  }, [setError]);

  const updateTransactionSplits = useCallback(async (id: number, splits: any[]) => {
    try {
      const transaction = await apiClient.updateTransactionSplits(id, splits);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update transaction splits');
      throw error;
    }
  }, [setError]);

  const bulkUpdateTransactionAccount = useCallback(async (transactionIds: number[], accountId: number) => {
    try {
      const result = await apiClient.bulkUpdateTransactionAccount(transactionIds, accountId);
      // Refresh transactions to show updated data
      await fetchTransactions();
      return result;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to bulk update transactions');
      throw error;
    }
  }, [setError, fetchTransactions]);

  // Summary
  const fetchSummary = useCallback(async (filters?: Partial<Filter>) => {
    setLoading('summary', true);
    try {
      const summary = await apiClient.getTransactionSummary(filters);
      dispatch({ type: 'SET_SUMMARY', payload: summary });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch summary');
    } finally {
      setLoading('summary', false);
    }
  }, [setLoading, setError]);

  const setFilters = useCallback((filters: Partial<Filter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const value = {
    state,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    toggleGoalStatus,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    updateTransactionSplits,
    bulkUpdateTransactionAccount,
    fetchSummary,
    setFilters,
    clearError,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}