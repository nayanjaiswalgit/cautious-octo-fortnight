import { useState, useCallback, useEffect } from 'react';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle, Lock, CreditCard, Trash2, Eye, Settings, Edit3, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Account } from '../types';
import { Modal } from './Modal';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed' | 'error';
  transactions?: number;
  errors?: string[];
  session_id?: number;
  account_id?: number;
  account_name?: string;
}

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
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium">Password Protected PDF</h3>
        </div>
        <p className="text-gray-600 mb-4">
          The file "{filename}" is password protected. Please enter the password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Upload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{file: File, fileId: string} | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showAccountChangeModal, setShowAccountChangeModal] = useState<{sessionId: number, currentAccount: string} | null>(null);
  const [newAccountId, setNewAccountId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');

  const loadUploadSessions = useCallback(async () => {
    try {
      const sessions = await apiClient.getUploadSessions();
      
      const existingFiles: UploadedFile[] = sessions.map((session: any) => ({
        id: session.id.toString(),
        name: session.filename,
        size: session.file_size || 0,
        type: 'pdf',
        status: session.status,
        transactions: session.processed_transactions,
        errors: session.error_message ? [session.error_message] : undefined,
        session_id: session.id,
        account_id: session.account_id,
        account_name: session.account_name
      }));
      
      setFiles(existingFiles);
    } catch (error) {
      console.error('Failed to load upload sessions:', error);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const accountsData = await apiClient.getAccounts();
      setAccounts(accountsData);
      
      // Set default account if accounts exist
      if (accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }, [selectedAccountId]);

  // Load existing upload sessions and accounts on component mount
  useEffect(() => {
    loadUploadSessions();
    loadAccounts();
  }, [loadUploadSessions, loadAccounts]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const pollUploadStatus = useCallback(async (sessionId: number, fileId: string) => {
    try {
      const statusResponse = await apiClient.getUploadStatus(sessionId);
      
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? {
              ...f,
              status: statusResponse.status,
              transactions: statusResponse.processed_transactions,
              errors: statusResponse.error_message ? [statusResponse.error_message] : undefined
            }
          : f
      ));

      // If still processing, poll again after 2 seconds
      if (statusResponse.status === 'processing') {
        setTimeout(() => pollUploadStatus(sessionId, fileId), 2000);
      }
    } catch (error) {
      console.error('Failed to poll upload status:', error);
      // Mark as error if polling fails
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', errors: ['Failed to check upload status'] }
          : f
      ));
    }
  }, []);

  const uploadFileToAPI = async (file: File, password?: string): Promise<UploadedFile> => {
    try {
      const response = await apiClient.uploadFile(file, password, selectedAccountId || undefined);

      const uploadedFile = {
        id: response.session_id.toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: response.status as 'processing' | 'completed' | 'error',
        transactions: response.total_transactions,
        session_id: response.session_id
      };

      // Start polling for status updates if still processing
      if (response.status === 'processing') {
        setTimeout(() => pollUploadStatus(response.session_id, uploadedFile.id), 1000);
      }

      return uploadedFile;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Upload failed';
      
      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('password')) {
        throw new Error('PASSWORD_REQUIRED');
      }
      
      throw new Error(errorMessage);
    }
  };

  const processFile = async (file: File, password?: string): Promise<UploadedFile> => {
    const uploadedFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing'
    };

    try {
      const result = await uploadFileToAPI(file, password);
      return result;
    } catch (error: any) {
      if (error.message === 'PASSWORD_REQUIRED') {
        throw error; // Re-throw to trigger password prompt
      }
      
      return {
        ...uploadedFile,
        status: 'error',
        errors: [error.message]
      };
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!showPasswordPrompt) return;
    
    const { file, fileId } = showPasswordPrompt;
    setShowPasswordPrompt(null);

    try {
      const processedFile = await processFile(file, password);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? processedFile : f
      ));
    } catch (error: any) {
      if (error.message === 'PASSWORD_REQUIRED') {
        // Still need password - show prompt again
        setShowPasswordPrompt({ file, fileId });
      } else {
        // Other error
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error', errors: [error.message] }
            : f
        ));
      }
    }
  };

  const handlePasswordCancel = () => {
    if (!showPasswordPrompt) return;
    
    const { fileId } = showPasswordPrompt;
    setShowPasswordPrompt(null);
    
    // Remove the file from the list
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file and its associated transactions?')) {
      return;
    }

    try {
      // Find the file
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // If it has a session_id, delete from server
      if (file.session_id) {
        await apiClient.deleteUploadSession(file.session_id);
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  }, [files]);

  const handleAccountChange = useCallback(async () => {
    if (!showAccountChangeModal || !newAccountId) return;
    
    try {
      // Get all transactions from this upload session
      const transactions = await apiClient.getTransactions({
        upload_session: showAccountChangeModal.sessionId
      });
      
      if (transactions.results && transactions.results.length > 0) {
        const transactionIds = transactions.results.map(t => Number(t.id));
        const result = await apiClient.bulkUpdateTransactionAccount(transactionIds, newAccountId);
        
        alert(`Successfully updated ${result.updated_count} transactions to account: ${result.account_name}`);
        
        // Refresh upload sessions to show updated account info
        await loadUploadSessions();
      }
      
      setShowAccountChangeModal(null);
      setNewAccountId(null);
    } catch (error: any) {
      console.error('Failed to change account:', error);
      alert(`Failed to change account: ${error.response?.data?.error || error.message}`);
    }
  }, [showAccountChangeModal, newAccountId, loadUploadSessions]);

  const startEditing = useCallback((fileId: string, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingFileId(null);
    setEditingFileName('');
  }, []);

  const saveFileName = useCallback(async (fileId: string, sessionId: number) => {
    if (!editingFileName.trim()) {
      cancelEditing();
      return;
    }

    try {
      await apiClient.updateUploadSession(sessionId, { filename: editingFileName.trim() });
      
      // Update local state
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, name: editingFileName.trim() } : f
      ));
      
      cancelEditing();
    } catch (error: any) {
      console.error('Failed to rename file:', error);
      alert(`Failed to rename file: ${error.response?.data?.error || error.message}`);
    }
  }, [editingFileName, cancelEditing]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!selectedAccountId) {
      alert('Please select an account before uploading files.');
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Filter for PDF, JSON, and CSV files
    const supportedFiles = droppedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );
    
    if (supportedFiles.length === 0) {
      alert('Please upload PDF, JSON, or CSV files only.');
      return;
    }

    const newFiles: UploadedFile[] = supportedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i];
      const fileId = newFiles[i].id;
      
      try {
        const processedFile = await processFile(file);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? processedFile : f
        ));
      } catch (error: any) {
        if (error.message === 'PASSWORD_REQUIRED') {
          setShowPasswordPrompt({ file, fileId });
        } else {
          setFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error', errors: [error.message] }
              : f
          ));
        }
      }
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAccountId) {
      alert('Please select an account before uploading files.');
      e.target.value = '';
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    
    // Filter for PDF, JSON, and CSV files
    const supportedFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );
    
    if (supportedFiles.length === 0) {
      alert('Please upload PDF, JSON, or CSV files only.');
      e.target.value = '';
      return;
    }
    
    const newFiles: UploadedFile[] = supportedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i];
      const fileId = newFiles[i].id;
      
      try {
        const processedFile = await processFile(file);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? processedFile : f
        ));
      } catch (error: any) {
        if (error.message === 'PASSWORD_REQUIRED') {
          setShowPasswordPrompt({ file, fileId });
        } else {
          setFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error', errors: [error.message] }
              : f
          ));
        }
      }
    }

    e.target.value = '';
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Transactions</h1>
        <p className="text-gray-600">Import your bank statements and transaction files</p>
      </div>

      {/* Account Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Account for Transactions
        </label>
        <select
          value={selectedAccountId || ''}
          onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select an account...</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.account_type}) - ${parseFloat(account.balance || '0').toFixed(2)}
            </option>
          ))}
        </select>
        {accounts.length === 0 && (
          <p className="text-sm text-gray-500 mt-1">
            No accounts available. Please create an account first.
          </p>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            Drop your files here, or{' '}
            <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
              browse
              <input
                type="file"
                multiple
                accept=".pdf,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports PDF bank statements, JSON transaction files, and CSV files up to 10MB
          </p>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-2xl border border-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Upload History</h3>
          <p className="text-sm text-gray-600 mt-1">Track your uploaded statements and transactions</p>
        </div>
        
        {files.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <UploadIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h4>
            <p className="text-gray-600">Upload your first bank statement to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {files.map((file, index) => {
              return (
                <div key={file.id} className={`group px-6 py-5 transition-all duration-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl ${
                        file.status === 'completed' ? 'bg-green-100' :
                        file.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <FileText className={`h-6 w-6 ${
                          file.status === 'completed' ? 'text-green-600' :
                          file.status === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {editingFileId === file.id ? (
                            <div className="flex items-center space-x-2 flex-1">
                              <input
                                type="text"
                                value={editingFileName}
                                onChange={(e) => setEditingFileName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveFileName(file.id, file.session_id!);
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                                className="flex-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => saveFileName(file.id, file.session_id!)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                              {file.session_id && (
                                <button
                                  onClick={() => startEditing(file.id, file.name)}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Rename file"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            file.status === 'completed' ? 'bg-green-100 text-green-800' :
                            file.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{formatFileSize(file.size)}</span>
                          {file.account_name && (
                            <span className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-1" />
                              {file.account_name}
                            </span>
                          )}
                        </div>
                        {file.status === 'completed' && file.transactions && (
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="inline-flex items-center text-sm text-green-700 font-medium">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {file.transactions} transactions imported
                            </span>
                          </div>
                        )}
                        {file.status === 'error' && file.errors && (
                          <div className="mt-2">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-start">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="text-sm text-red-700">
                                  {file.errors.join(', ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {file.status === 'completed' && file.session_id && (
                        <>
                          <button
                            onClick={() => {
                              const currentAccount = file.account_name || 'Unknown Account';
                              setShowAccountChangeModal({
                                sessionId: file.session_id!,
                                currentAccount
                              });
                              setNewAccountId(file.account_id || null);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                            title="Change account for transactions"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Navigate to statement viewer for this upload session
                              navigate(`/statement-viewer?upload_session=${file.session_id}`);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="View statement in Excel-like viewer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {getStatusIcon(file.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Supported File Formats</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>PDF:</strong> Bank statements with transaction data (supports password-protected files)</li>
          <li>• <strong>CSV:</strong> Structured transaction data with columns: date, description, amount (+ optional: category, account_name, notes, tags)</li>
          <li>• <strong>JSON:</strong> Transaction data in JSON format</li>
          <li>• <strong>Password Support:</strong> If your PDF is encrypted, you'll be prompted to enter the password</li>
          <li>• <strong>Processing:</strong> Text extraction will identify transactions, dates, descriptions, and amounts</li>
        </ul>
      </div>
      
      {/* Account Change Modal */}
      <Modal
        isOpen={!!showAccountChangeModal}
        onClose={() => {
          setShowAccountChangeModal(null);
          setNewAccountId(null);
        }}
        title="Change Account for Transactions"
      >
        {showAccountChangeModal && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">Account Change</h4>
              <p className="text-sm text-yellow-700">
                This will change the account for all transactions imported from this file.
                Current account: <strong>{showAccountChangeModal.currentAccount}</strong>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Account
              </label>
              <select
                value={newAccountId || ''}
                onChange={(e) => setNewAccountId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_type}) - ${parseFloat(account.balance || '0').toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAccountChangeModal(null);
                  setNewAccountId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccountChange}
                disabled={!newAccountId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Account
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {showPasswordPrompt && (
        <PasswordPrompt
          filename={showPasswordPrompt.file.name}
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      )}
    </div>
  );
};