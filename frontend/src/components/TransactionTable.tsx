import { useState, useMemo, useEffect } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import type { Transaction, TransactionSplit, Filter as FilterType } from '../types';
import { Filter, ChevronUp, ChevronDown, Split, Upload, Lock, CheckSquare, Square, Sparkles, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { Select } from './Select';
import { Button } from './Button';
import { Input } from './Input';
import { TagInput } from './TagInput';
import { SplitEditor } from './SplitEditor';
import ReceiptScanner from './ReceiptScanner';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/preferences';
import { sanitizeInput } from '../utils/security';
import { apiClient } from '../api/client';
import { useSearchParams } from 'react-router-dom';

const columnHelper = createColumnHelper<Transaction>();

interface PasswordPromptProps {
  filename: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

const PasswordPrompt = ({ filename, onSubmit, onCancel }: PasswordPromptProps) => {
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium theme-text-primary">Password Protected PDF</h3>
        </div>
        <p className="theme-text-secondary mb-4">
          The file "{filename}" is password protected. Please enter the password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onCancel}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
            >
              Upload
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TransactionTable = () => {
  const [searchParams] = useSearchParams();
  const { state, fetchTransactions, createTransaction, updateTransaction, updateTransactionSplits, bulkUpdateTransactionAccount, deleteTransaction } = useData();
  const { state: authState } = useAuth();
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editingData, setEditingData] = useState<Partial<Transaction>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTransaction, setSplitTransaction] = useState<Transaction | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadAccount, setSelectedUploadAccount] = useState<number | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{file: File, filename: string} | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    accountId?: number;
    categoryId?: string;
    tags?: string[];
    verified?: boolean;
    action?: 'edit' | 'delete';
  }>({});
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showReceiptScannerModal, setShowReceiptScannerModal] = useState(false);
  const [newTransactionData, setNewTransactionData] = useState<{
    description: string;
    amount: string;
    date: string;
    accountId: number | null;
    categoryId: string;
    notes: string;
    tags: string[];
  }>({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: null,
    categoryId: '',
    notes: '',
    tags: []
  });
  const [bulkTransactionData, setBulkTransactionData] = useState<{
    transactions: string;
    defaultAccountId: number | null;
    defaultCategoryId: string;
    defaultDate: string;
  }>({
    transactions: '',
    defaultAccountId: null,
    defaultCategoryId: '',
    defaultDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Get filters from URL params
    const uploadSession = searchParams.get('upload_session');
    const groupExpense = searchParams.get('group_expense');
    
    const filters: Partial<FilterType> = {};
    if (uploadSession) filters.upload_session = Number(uploadSession);
    if (groupExpense) filters.group_expense = Number(groupExpense);
    
    fetchTransactions(Object.keys(filters).length > 0 ? filters : undefined);
    // Set default account if available
    if (state.accounts.length > 0 && !selectedUploadAccount) {
      setSelectedUploadAccount(state.accounts[0].id);
    }
  }, [fetchTransactions, state.accounts, selectedUploadAccount, searchParams]);

  // Helper functions for inline editing
  const startEditing = (transactionId: number, field: string, currentValue: unknown) => {
    setEditingCell({ id: transactionId.toString(), field });
    setEditingData({ [field]: currentValue });
  };

  const saveField = async (transactionId: number, field: string, value: unknown) => {
    try {
      await updateTransaction(transactionId, { [field]: value });
      setEditingCell(null);
      setEditingData({});
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingData({});
  };

  // Notion-style cell components
  const EditableTextCell = ({ transaction, field, value, placeholder = "Empty" }: {
    transaction: Transaction;
    field: string;
    value: string;
    placeholder?: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          type="text"
          value={(editingData as Record<string, unknown>)[field] as string || value || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [field]: e.target.value }))}
          onBlur={() => saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value);
            } else if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md transition-colors duration-150 flex items-center"
      >
        {value || <span className="theme-text-muted italic">{placeholder}</span>}
      </div>
    );
  };

  const EditableSelectCell = ({ transaction, field, value, options, placeholder = "Select..." }: {
    transaction: Transaction;
    field: string;
    value: unknown;
    options: { value: unknown; label: string }[];
    placeholder?: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Select
          value={(editingData as Record<string, unknown>)[field] !== undefined ? (editingData as Record<string, unknown>)[field] as string : value as string || ''}
          onChange={(e) => {
            const newValue = e.target.value || undefined;
            setEditingData(prev => ({ ...prev, [field]: newValue }));
            saveField(transaction.id, field, newValue);
          }}
          onBlur={cancelEditing}
          options={options}
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    const selectedOption = options.find(opt => opt.value === value);
    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
      >
        {selectedOption ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {selectedOption.label}
          </span>
        ) : (
          <span className="theme-text-muted italic">{placeholder}</span>
        )}
      </div>
    );
  };


  const EditableDateCell = ({ transaction, field, value }: {
    transaction: Transaction;
    field: string;
    value: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          type="date"
          value={(editingData as Record<string, unknown>)[field] as string || value || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [field]: e.target.value }))}
          onBlur={() => saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value);
            } else if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
      >
        <span className="theme-text-primary font-medium">
          {new Date(value).toLocaleDateString()}
        </span>
      </div>
    );
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        const allSelected = table.getRowModel().rows.length > 0 && 
          table.getRowModel().rows.every(row => selectedRows.has(row.original.id));
        const someSelected = table.getRowModel().rows.some(row => selectedRows.has(row.original.id));
        
        return (
          <div className="flex items-center">
            <Button
              onClick={() => handleSelectAll(!allSelected)}
              variant="ghost"
              size="sm"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : someSelected ? (
                <div className="h-4 w-4 bg-blue-600 border border-blue-600 rounded flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-sm"></div>
                </div>
              ) : (
                <Square className="h-4 w-4 theme-text-muted" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <div className="flex items-center">
            <button
              onClick={() => handleRowSelection(row.original.id, !isSelected)}
              className="theme-btn-icon"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 theme-text-muted" />
              )}
            </button>
          </div>
        );
      },
      size: 40,
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: ({ getValue, row }) => (
        <EditableDateCell
          transaction={row.original}
          field="date"
          value={getValue()}
        />
      ),
      size: 120,
    }),
    columnHelper.accessor('description', {
      header: 'Description', 
      cell: ({ getValue, row }) => (
        <EditableTextCell
          transaction={row.original}
          field="description"
          value={getValue()}
          placeholder="Add description..."
        />
      ),
      size: 250,
    }),
    columnHelper.accessor('account_id', {
      header: 'Account',
      cell: ({ getValue, row }) => (
        <EditableSelectCell
          transaction={row.original}
          field="account_id"
          value={getValue()}
          options={state.accounts.map(acc => ({ value: acc.id, label: acc.name }))}
          placeholder="Select account"
        />
      ),
      size: 150,
    }),
    columnHelper.accessor('category_id', {
      header: 'Category',
      cell: ({ getValue, row }) => (
        <EditableSelectCell
          transaction={row.original}
          field="category_id"
          value={getValue()}
          options={state.categories.map(cat => ({ value: cat.id, label: cat.name }))}
          placeholder="No category"
        />
      ),
      size: 150,
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'amount';
        const value = getValue();
        
        if (isEditing) {
          return (
            <Input
              type="number"
              step="0.01"
              value={editingData.amount !== undefined ? editingData.amount : value || ''}
              onChange={(e) => setEditingData(prev => ({ ...prev, amount: e.target.value }))}
              onBlur={() => saveField(row.original.id, 'amount', editingData.amount || value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveField(row.original.id, 'amount', editingData.amount || value);
                } else if (e.key === 'Escape') {
                  cancelEditing();
                }
              }}
              autoFocus
            />
          );
        }
        
        return (
          <div
            onClick={() => startEditing(row.original.id, 'amount', value)}
            className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md text-right flex items-center justify-end transition-colors duration-150"
          >
            <span className={`font-medium ${parseFloat(value) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(value) > 0 ? '+' : ''}{formatCurrency(parseFloat(value), authState.user)}
            </span>
          </div>
        );
      },
      size: 120,
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'tags';
        const value = getValue();
        
        if (isEditing) {
          return (
            <TagInput
              tags={editingData.tags || value}
              onTagsChange={(newTags) => setEditingData(prev => ({ ...prev, tags: newTags }))}
              onBlur={() => saveField(row.original.id, 'tags', editingData.tags || value)}
            />
          );
        }
        
        return (
          <div 
            onClick={() => startEditing(row.original.id, 'tags', value)}
            className="flex flex-wrap gap-1 px-3 py-2 min-h-[36px] cursor-pointer hover:bg-blue-50 rounded-md transition-colors duration-150 items-center"
          >
            {value.length > 0 ? (
              value.map((tag, index) => (
                <span key={index} className="px-2.5 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                  {tag}
                </span>
              ))
            ) : (
              <span className="theme-text-muted text-sm italic">Add tags...</span>
            )}
          </div>
        );
      },
      size: 200,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes',
      cell: ({ getValue, row }) => (
        <EditableTextCell
          transaction={row.original}
          field="notes"
          value={getValue() || ''}
          placeholder="Add notes..."
        />
      ),
      size: 200,
    }),
    columnHelper.accessor('verified', {
      header: 'Verified',
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'verified';
        const value = getValue();
        
        if (isEditing) {
          return (
            <Select
              value={editingData.verified !== undefined ? editingData.verified.toString() : value.toString()}
              onChange={(e) => {
                const newValue = e.target.value === 'true';
                setEditingData(prev => ({ ...prev, verified: newValue }));
                saveField(row.original.id, 'verified', newValue);
              }}
              onBlur={cancelEditing}
              options={[{ value: "true", label: "Verified" }, { value: "false", label: "Unverified" }]}
              autoFocus
            />
          );
        }
        
        return (
          <div
            onClick={() => startEditing(row.original.id, 'verified', value)}
            className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
          >
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              value 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {value ? 'Verified' : 'Unverified'}
            </span>
          </div>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const transaction = row.original;
        
        return (
          <div className="flex gap-1">
            <Button
              onClick={() => handleSplitEdit(transaction)}
              variant="ghost"
              size="sm"
              title="Edit category splits"
            >
              <Split className="h-4 w-4" />
            </Button>
            {transaction.suggested_category && !transaction.category_id && (
              <Button
              onClick={() => handleAcceptSuggestion(transaction)}
              variant="ghost"
              size="sm"
              title="Accept suggested category"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            )}
            <Button
              onClick={() => handleAutoCategorize(transaction)}
              variant="ghost"
              size="sm"
              title="Auto-categorize"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 120,
    })
  ], [editingCell, editingData, selectedRows, state.accounts, state.categories, authState.user]);

  const table = useReactTable({
    data: state.transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });


  const handleSplitEdit = (transaction: Transaction) => {
    setSplitTransaction(transaction);
    setSplitModalOpen(true);
  };

  const handleSplitsUpdate = async (splits: TransactionSplit[]) => {
    if (splitTransaction) {
      try {
        await updateTransactionSplits(Number(splitTransaction.id), splits);
      } catch (error) {
        console.error('Failed to update transaction splits:', error);
        alert('Failed to update transaction splits. Please try again.');
      }
    }
  };

  const uploadFileToAPI = async (file: File, password?: string): Promise<any> => {
    try {
      const response = await apiClient.uploadFile(file, password, selectedUploadAccount || undefined);
      return response;
    } catch (error: unknown) {
      const errorMessage = error.response?.data?.error || 'Upload failed';
      
      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('password')) {
        throw new Error('PASSWORD_REQUIRED');
      }
      
      throw new Error(errorMessage);
    }
  };

  const processFile = async (file: File, password?: string): Promise<any> => {
    try {
      const result = await uploadFileToAPI(file, password);
      return result;
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        throw error; // Re-throw to trigger password prompt
      }
      
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedUploadAccount) {
      alert('Please select an account before uploading.');
      return;
    }

    try {
      console.log('Uploading file:', file.name, 'to account:', selectedUploadAccount);
      const result = await processFile(file);
      console.log('Upload result:', result);
      alert(`File uploaded successfully! ${result.total_transactions} transactions processed.`);
      // Refresh transactions to show new data
      await fetchTransactions();
      setShowUploadModal(false);
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        setShowPasswordPrompt({ file, filename: file.name });
      } else {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
      }
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!showPasswordPrompt) return;
    
    const { file } = showPasswordPrompt;
    setShowPasswordPrompt(null);

    try {
      const result = await processFile(file, password);
      console.log('Upload result:', result);
      alert(`File uploaded successfully! ${result.total_transactions} transactions processed.`);
      // Refresh transactions to show new data
      await fetchTransactions();
      setShowUploadModal(false);
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        // Still need password - show prompt again
        setShowPasswordPrompt({ file, filename: file.name });
        alert('Incorrect password. Please try again.');
      } else {
        // Other error
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
      }
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(null);
  };

  const handleRowSelection = (transactionId: number, selected: boolean) => {
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(transactionId);
    } else {
      newSelection.delete(transactionId);
    }
    setSelectedRows(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(state.transactions.map(t => t.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  // const handleBulkEdit = () => {
  //   if (selectedRows.size === 0) {
  //     alert('Please select at least one transaction to edit.');
  //     return;
  //   }
  //   setBulkEditData({ action: 'edit' });
  //   setShowBulkEdit(true);
  // };

  // const handleBulkDelete = () => {
  //   if (selectedRows.size === 0) {
  //     alert('Please select at least one transaction to delete.');
  //     return;
  //   }
  //   setBulkEditData({ action: 'delete' });
  //   setShowBulkEdit(true);
  // };

  const handleBulkSave = async () => {
    if (selectedRows.size === 0) return;

    try {
      if (bulkEditData.action === 'delete') {
        if (!confirm(`Are you sure you want to delete ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.`)) {
          return;
        }
        
        // Delete transactions
        const deletePromises = Array.from(selectedRows).map(id => 
          deleteTransaction(Number(id))
        );
        await Promise.all(deletePromises);
        
        alert(`Successfully deleted ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''}.`);
      } else {
        const promises = [];
        
        // Handle account change
        if (bulkEditData.accountId) {
          const transactionIds = Array.from(selectedRows).map(id => Number(id));
          promises.push(bulkUpdateTransactionAccount(transactionIds, bulkEditData.accountId));
        }

        // Handle category change - we'll need individual updates for this
        if (bulkEditData.categoryId) {
          const categoryPromises = Array.from(selectedRows).map(id => 
            updateTransaction(Number(id), { category_id: bulkEditData.categoryId })
          );
          promises.push(...categoryPromises);
        }

        // Handle verification change
        if (bulkEditData.verified !== undefined) {
          const verifyPromises = Array.from(selectedRows).map(id => 
            updateTransaction(Number(id), { verified: bulkEditData.verified })
          );
          promises.push(...verifyPromises);
        }

        // Handle tags addition
        if (bulkEditData.tags && bulkEditData.tags.length > 0) {
          const tagPromises = Array.from(selectedRows).map(id => {
            const transaction = state.transactions.find(t => t.id === id);
            if (transaction) {
              const newTags = [...new Set([...transaction.tags, ...bulkEditData.tags!])];
              return updateTransaction(Number(id), { tags: newTags });
            }
            return Promise.resolve();
          });
          promises.push(...tagPromises);
        }

        await Promise.all(promises);
        
        alert(`Successfully updated ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''}.`);
      }
      
      // Clear selection and close bulk edit
      setSelectedRows(new Set());
      setShowBulkEdit(false);
      setBulkEditData({});
    } catch (error) {
      console.error('Failed to bulk update transactions:', error);
      alert('Failed to update transactions. Please try again.');
    }
  };

  const handleBulkCancel = () => {
    setShowBulkEdit(false);
    setBulkEditData({});
  };

  const handleAcceptSuggestion = async (transaction: Transaction) => {
    try {
      await apiClient.acceptSuggestedCategory(Number(transaction.id));
      // Update local state
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      alert('Failed to accept suggestion. Please try again.');
    }
  };

  const handleAutoCategorize = async (transaction: Transaction) => {
    try {
      await apiClient.autoCategorizTransaction(Number(transaction.id));
      // Update local state
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to auto-categorize:', error);
      alert('Failed to auto-categorize. Please try again.');
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransactionData.description || !newTransactionData.amount || !newTransactionData.accountId) {
      alert('Please fill in all required fields (description, amount, account)');
      return;
    }

    try {
      await createTransaction({
        description: sanitizeInput(newTransactionData.description),
        amount: newTransactionData.amount.toString(),
        date: newTransactionData.date,
        account_id: newTransactionData.accountId!,
        category_id: newTransactionData.categoryId || undefined,
        transaction_type: parseFloat(newTransactionData.amount) >= 0 ? 'credit' : 'debit',
        notes: sanitizeInput(newTransactionData.notes),
        tags: newTransactionData.tags.map(tag => sanitizeInput(tag)),
        verified: true,
        splits: []
      });

      // Reset form and close modal
      setNewTransactionData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: null,
        categoryId: '',
        notes: '',
        tags: []
      });
      setShowAddTransactionModal(false);

      alert('Transaction created successfully!');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. Please try again.');
    }
  };

  const handleBulkAddTransactions = async () => {
    if (!bulkTransactionData.transactions.trim() || !bulkTransactionData.defaultAccountId) {
      alert('Please enter transactions and select a default account');
      return;
    }

    try {
      // Parse the bulk transaction text
      const lines = bulkTransactionData.transactions.trim().split('\n');
      const transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          // Support multiple formats:
          // Format 1: "Description, Amount, Date (optional), Category (optional)"
          // Format 2: "Description | Amount | Date (optional) | Category (optional)"
          // Format 3: "Amount Description Date (space separated)"
          
          let description = '';
          let amount = 0;
          let date = bulkTransactionData.defaultDate;
          let categoryId = bulkTransactionData.defaultCategoryId;
          
          // Try comma-separated format first
          if (line.includes(',')) {
            const parts = line.split(',').map(part => part.trim());
            description = parts[0] || '';
            amount = parseFloat(parts[1]) || 0;
            if (parts[2] && parts[2].match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = parts[2];
            }
            if (parts[3]) {
              const foundCategory = state.categories.find(cat => 
                cat.name.toLowerCase().includes(parts[3].toLowerCase())
              );
              if (foundCategory) categoryId = foundCategory.id;
            }
          }
          // Try pipe-separated format
          else if (line.includes('|')) {
            const parts = line.split('|').map(part => part.trim());
            description = parts[0] || '';
            amount = parseFloat(parts[1]) || 0;
            if (parts[2] && parts[2].match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = parts[2];
            }
            if (parts[3]) {
              const foundCategory = state.categories.find(cat => 
                cat.name.toLowerCase().includes(parts[3].toLowerCase())
              );
              if (foundCategory) categoryId = foundCategory.id;
            }
          }
          // Try space-separated format (amount first)
          else {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              // Check if first part is a number
              if (!isNaN(parseFloat(parts[0]))) {
                amount = parseFloat(parts[0]);
                description = parts.slice(1).join(' ');
              } else {
                // Description first, try to find amount in the string
                const amountMatch = line.match(/-?\d+\.?\d*/);
                if (amountMatch) {
                  amount = parseFloat(amountMatch[0]);
                  description = line.replace(amountMatch[0], '').trim();
                } else {
                  description = line;
                  amount = 0;
                }
              }
            }
          }

          if (description && amount !== 0) {
            const transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
              description: description,
              amount: amount.toString(),
              date: date,
              account_id: bulkTransactionData.defaultAccountId!,
              category_id: categoryId || undefined,
              transaction_type: amount >= 0 ? 'credit' : 'debit',
              notes: '',
              tags: [],
              verified: true,
              splits: []
            };
            transactions.push(transactionData);
          }
        } catch (lineError) {
          console.warn('Failed to parse line:', line);
          errorCount++;
        }
      }

      // Create all transactions
      for (const transaction of transactions) {
        try {
          await createTransaction(transaction);
          successCount++;
        } catch (error) {
          console.error('Failed to create transaction:', transaction.description, error);
          errorCount++;
        }
      }

      // Reset form and close modal
      setBulkTransactionData({
        transactions: '',
        defaultAccountId: null,
        defaultCategoryId: '',
        defaultDate: new Date().toISOString().split('T')[0]
      });
      setShowBulkAddModal(false);

      if (successCount > 0) {
        alert(`Successfully created ${successCount} transactions${errorCount > 0 ? `. ${errorCount} failed to create.` : '!'}`);
      } else {
        alert('No transactions were created. Please check your format.');
      }
    } catch (error) {
      console.error('Failed to create bulk transactions:', error);
      alert('Failed to create transactions. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {(searchParams.get('upload_session') || searchParams.get('group_expense')) && (
        <div className="theme-alert-info">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Filtered View</h4>
          <p className="text-sm text-blue-700">
            {searchParams.get('upload_session') && 
              <>Showing transactions from upload session #{searchParams.get('upload_session')}.</>
            }
            {searchParams.get('group_expense') && 
              <>Showing transactions from group expense #{searchParams.get('group_expense')}.</>
            }
            <button 
              onClick={() => window.location.href = '/transactions'}
              className="text-blue-600 underline ml-1"
            >
              View all transactions
            </button>
          </p>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold theme-text-primary">Transactions</h1>
          <p className="theme-text-secondary mt-1">View, edit, and manage all your transactions.</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowAddTransactionModal(true)}
            size="sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Transaction
          </Button>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="secondary"
            size="sm"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload
          </Button>
          <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </Button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Search descriptions..."
              value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('description')?.setFilterValue(e.target.value)}
            />
            <Select
              value={(table.getColumn('account_id')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('account_id')?.setFilterValue(e.target.value || undefined)}
              className="theme-input"
              options={[
                { value: "", label: "All accounts" },
                ...state.accounts.map(account => ({ value: account.id, label: account.name }))
              ]}
            />
            <Select
              value={(table.getColumn('category_id')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('category_id')?.setFilterValue(e.target.value || undefined)}
              className="theme-input"
              options={[
                { value: "", label: "All categories" },
                ...state.categories.map(category => ({ value: category.id, label: category.name }))
              ]}
            />
            <Button
              onClick={() => {
                table.getColumn('description')?.setFilterValue('');
                table.getColumn('account_id')?.setFilterValue(undefined);
                table.getColumn('category_id')?.setFilterValue(undefined);
              }}
              variant="ghost"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50 dark:bg-gray-700">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-semibold theme-text-secondary uppercase tracking-wider cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-2 flex-col">
                          <ChevronUp className={`h-3 w-3 ${header.column.getIsSorted() === 'asc' ? 'text-gray-900' : 'theme-text-muted'}`} />
                          <ChevronDown className={`h-3 w-3 ${header.column.getIsSorted() === 'desc' ? 'text-gray-900' : 'theme-text-muted'}`} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${editingCell?.id === row.original.id.toString() ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        title={`Edit Splits - ${splitTransaction?.description || 'Transaction'}`}
      >
        {splitTransaction && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm theme-text-secondary">
                <div>Transaction: {splitTransaction.description}</div>
                <div>Amount: ${Math.abs(parseFloat(splitTransaction.amount)).toFixed(2)}</div>
                <div>Date: {new Date(splitTransaction.date).toLocaleDateString()}</div>
              </div>
            </div>
            
            <SplitEditor
              splits={splitTransaction.splits || []}
              totalAmount={parseFloat(splitTransaction.amount)}
              onSplitsChange={handleSplitsUpdate}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
              onClick={() => setSplitModalOpen(false)}
              variant="secondary"
              size="md"
            >
              Close
            </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Bank Statement"
      >
        <div className="space-y-4">
          <div className="theme-alert-info">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Supported File Formats</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>CSV:</strong> date,description,amount,category,account_name,notes,tags</li>
              <li>• <strong>PDF:</strong> Bank statements with transaction data</li>
              <li>• <strong>JSON:</strong> Transaction data in JSON format</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            {/* Account Selection */}
            <div>
              <Select
                label="Select Account for Transactions"
                value={selectedUploadAccount || ''}
                onChange={(e) => setSelectedUploadAccount(e.target.value ? Number(e.target.value) : null)}
                options={[
                  { value: "", label: "Select an account..." },
                  ...state.accounts.map((account) => ({ value: account.id, label: `${account.name} (${account.account_type}) - ${formatCurrency(parseFloat(account.balance || '0'), authState.user)}` }))
                ]}
              />
              {state.accounts.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  No accounts available. Please create an account first.
                </p>
              )}
            </div>
            
            <p className="text-sm theme-text-secondary">
              Choose a file to upload. For CSV files, make sure to include headers with at least: date, description, amount.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 theme-text-muted" />
              <div className="mt-4">
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500 font-medium">
                    Choose file
                  </span>
                  <input
                    type="file"
                    accept=".csv,.pdf,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleFileUpload(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="text-sm theme-text-muted mt-1">
                  CSV, PDF, or JSON files up to 10MB
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowUploadModal(false)}
              className="theme-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEdit}
        onClose={handleBulkCancel}
        title={`${bulkEditData.action === 'delete' ? 'Delete' : 'Bulk Edit'} ${selectedRows.size} Transaction${selectedRows.size !== 1 ? 's' : ''}`}
      >
        <div className="space-y-6">
          {bulkEditData.action === 'delete' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">Confirm Deletion</h4>
              <p className="text-sm text-red-700">
                Are you sure you want to delete {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
          ) : (
            <div className="theme-alert-info">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Bulk Edit Options</h4>
              <p className="text-sm text-blue-700">
                Make changes to all {selectedRows.size} selected transactions. Only modified fields will be updated.
              </p>
            </div>
          )}
          
          {bulkEditData.action !== 'delete' && (
            <div className="space-y-4">
              {/* Account Selection */}
              <div>
                <Select
                  label="Change Account"
                  value={bulkEditData.accountId || ''}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    accountId: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  options={[
                    { value: "", label: "Keep current accounts" },
                    ...state.accounts.map((account) => ({ value: account.id, label: `${account.name} (${account.account_type}) - ${formatCurrency(parseFloat(account.balance || '0'), authState.user)}` }))
                  ]}
                />
              </div>

              {/* Category Selection */}
              <div>
                <Select
                  label="Change Category"
                  value={bulkEditData.categoryId || ''}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    categoryId: e.target.value || undefined 
                  }))}
                  options={[
                    { value: "", label: "Keep current categories" },
                    ...state.categories.map((category) => ({ value: category.id, label: category.name }))
                  ]}
                />
              </div>

              {/* Verification Status */}
              <div>
                <Select
                  label="Verification Status"
                  value={bulkEditData.verified === undefined ? '' : bulkEditData.verified.toString()}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    verified: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  options={[
                    { value: "", label: "Keep current status" },
                    { value: "true", label: "Mark as Verified" },
                    { value: "false", label: "Mark as Unverified" },
                  ]}
                />
              </div>

              {/* Tags Addition */}
              <div>
                <TagInput
                  tags={bulkEditData.tags || []}
                  onTagsChange={(newTags) => setBulkEditData(prev => ({ 
                    ...prev, 
                    tags: newTags
                  }))}
                  placeholder="e.g. business, travel, important"
                />
                <p className="text-xs theme-text-muted mt-1">
                  These tags will be added to existing tags (duplicates will be ignored)
                </p>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-900 mb-1">Auto-Save</h5>
            <p className="text-sm text-yellow-700">
              Changes will be applied immediately when you click "Apply Changes". This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleBulkCancel}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSave}
              disabled={!bulkEditData.accountId && !bulkEditData.categoryId}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showAddTransactionModal}
        onClose={() => setShowAddTransactionModal(false)}
        title="Add New Transaction"
      >
        <div className="space-y-4">
          <div>
            <Input
              label="Description *"
              type="text"
              value={newTransactionData.description}
              onChange={(e) => setNewTransactionData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Transaction description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                value={newTransactionData.amount}
                onChange={(e) => setNewTransactionData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Input
                label="Date *"
                type="date"
                value={newTransactionData.date}
                onChange={(e) => setNewTransactionData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Select
              label="Account *"
              value={newTransactionData.accountId || ''}
              onChange={(e) => setNewTransactionData(prev => ({ ...prev, accountId: e.target.value ? Number(e.target.value) : null }))}
              options={[
                { value: "", label: "Select an account" },
                ...state.accounts.map((account) => ({ value: account.id, label: `${account.name} (${account.account_type})` }))
              ]}
            />
          </div>

          <div>
            <Select
              label="Category"
              value={newTransactionData.categoryId}
              onChange={(e) => setNewTransactionData(prev => ({ ...prev, categoryId: e.target.value }))}
              options={[
                { value: "", label: "No category" },
                ...state.categories.map((category) => ({ value: category.id, label: category.name }))
              ]}
            />
          </div>

          <div>
            <TagInput
              tags={newTransactionData.tags}
              onTagsChange={(newTags) => setNewTransactionData(prev => ({ ...prev, tags: newTags }))}
              placeholder="e.g. business, travel, important"
            />
          </div>

          <div>
            <Input
              label="Notes"
              value={newTransactionData.notes}
              onChange={(e) => setNewTransactionData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              multiline
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setShowAddTransactionModal(false)}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
            >
              Add Transaction
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Add Transactions Modal */}
      <Modal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        title="Bulk Add Transactions"
        size="lg"
      >
        <div className="space-y-6">
          <div className="theme-alert-info">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Supported formats:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Comma separated:</strong> Description, Amount, Date (YYYY-MM-DD), Category</li>
              <li>• <strong>Pipe separated:</strong> Description | Amount | Date | Category</li>
              <li>• <strong>Space separated:</strong> Amount Description (or Description Amount)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">Date and Category are optional. Default values will be used if not specified.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Default Account *"
                value={bulkTransactionData.defaultAccountId || ''}
                onChange={(e) => setBulkTransactionData(prev => ({ 
                  ...prev, 
                  defaultAccountId: e.target.value ? Number(e.target.value) : null 
                }))}
                options={[
                  { value: "", label: "Select account..." },
                  ...state.accounts.map(account => ({ value: account.id, label: `${account.name} (${account.account_type})` }))
                ]}
                required
              />
            </div>

            <div>
              <Select
                label="Default Category"
                value={bulkTransactionData.defaultCategoryId}
                onChange={(e) => setBulkTransactionData(prev => ({ ...prev, defaultCategoryId: e.target.value }))}
                options={[
                  { value: "", label: "No category" },
                  ...state.categories.map(category => ({ value: category.id, label: category.name }))
                ]}
              />
            </div>
          </div>

          <div>
            <Input
              label="Default Date"
              type="date"
              value={bulkTransactionData.defaultDate}
              onChange={(e) => setBulkTransactionData(prev => ({ ...prev, defaultDate: e.target.value }))}
            />
          </div>

          <div>
            <Input
              label="Transactions *"
              value={bulkTransactionData.transactions}
              onChange={(e) => setBulkTransactionData(prev => ({ ...prev, transactions: e.target.value }))}
              placeholder={`Examples:
Coffee shop, -4.50, 2024-01-15, Food
Grocery shopping | -85.20 | 2024-01-14 | Groceries
-50 Gas station
Salary deposit, 2500.00, 2024-01-01, Income`}
              multiline
              rows={8}
              required
            />
            <p className="text-xs theme-text-muted mt-1">
              Enter one transaction per line. Use negative amounts for expenses, positive for income.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setShowBulkAddModal(false)}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddTransactions}
            >
              Create Transactions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Scanner Modal */}
      <Modal
        isOpen={showReceiptScannerModal}
        onClose={() => setShowReceiptScannerModal(false)}
        title="Scan Receipt"
        size="xl"
      >
        <ReceiptScanner
          accounts={state.accounts}
          categories={state.categories}
          onTransactionCreated={() => {
            setShowReceiptScannerModal(false);
            // Refresh transactions to show the new one
            window.location.reload();
          }}
          onClose={() => setShowReceiptScannerModal(false)}
        />
      </Modal>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <PasswordPrompt
          filename={showPasswordPrompt.filename}
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      )}
    </div>
  );
};