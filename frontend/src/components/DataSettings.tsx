import React, { useState } from 'react';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { Upload, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

const DataSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange] = useState('30');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleDataExport = async () => {
    setIsLoading(true);
    
    try {
      const blob = await apiClient.exportTransactions('json');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Data Exported', 'Your financial data has been exported successfully.');
    } catch (error) {
      console.error('Data export failed:', error);
      showError('Export Failed', 'Unable to export your data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json' | 'excel' | 'pdf') => {
    try {
      setIsLoading(true);
      
      // Simplified filters for export
      const exportFilters = {
        dateFrom: selectedTimeRange !== 'all' ? 
          new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
          undefined,
        dateTo: undefined
      };
      
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
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (error as Error)?.message || 'Unknown error occurred';
      showError('Export Failed', `Unable to generate report: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataImport = async () => {
    if (!importFile) {
      showError('No File Selected', 'Please select a file to import.');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Determine import type based on file extension
      const fileName = importFile.name.toLowerCase();
      let importType = 'json';
      if (fileName.endsWith('.csv')) importType = 'csv';
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) importType = 'excel';
      
      await apiClient.importTransactions(formData, importType);
      
      setImportFile(null);
      setShowImportModal(false);
      showSuccess('Data Imported', 'Your financial data has been imported successfully.');
      
      // Refresh the page to show imported data
      window.location.reload();
    } catch (error) {
      console.error('Data import failed:', error);
      showError('Import Failed', 'Unable to import your data. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setIsLoading(true);
    
    try {
      await apiClient.deleteUserAccount();
      
      showSuccess('Account Deleted', 'Your account has been permanently deleted.');
      
      // Redirect to login after account deletion
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Account deletion failed:', error);
      showError('Deletion Failed', 'Unable to delete your account. Please try again or contact support.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Data & Privacy</h2>
      
      <div className="space-y-8">
        {/* Data Export */}
        <div className="theme-border-light border-b pb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium theme-text-primary">Export Your Data</h3>
            <p className="text-sm theme-text-secondary">Download a complete backup of your financial data</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { format: 'json', icon: '📄', label: 'JSON Backup' },
              { format: 'csv', icon: '📊', label: 'CSV Export' },
              { format: 'excel', icon: '📈', label: 'Excel File' },
              { format: 'pdf', icon: '📕', label: 'PDF Report' }
            ].map(({ format, icon, label }) => (
              <button
                key={format}
                onClick={() => format === 'json' ? handleDataExport() : handleExportReport(format)}
                disabled={isLoading}
                className="p-4 text-left theme-border border rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-4"
              >
                <div className="text-3xl">{icon}</div>
                <div>
                  <div className="font-semibold theme-text-primary">{label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Data Import */}
        <div className="theme-border-light border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium theme-text-primary">Import Data</h3>
              <p className="text-sm theme-text-secondary">Upload financial data from JSON, CSV, or Excel files</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="theme-btn-primary flex items-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Import Data</span>
            </button>
          </div>
        </div>

        {/* Account Deletion */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Delete Account</h3>
              <p className="text-sm theme-text-secondary">Permanently delete your account and all associated data</p>
            </div>
            <button
              className="theme-btn-danger flex items-center space-x-2"
              onClick={() => setShowDeleteConfirmModal(true)}
            >
              <Trash2 className="h-5 w-5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Data Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Financial Data"
      >
        <div className="space-y-6">
          <div className="theme-alert-info">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Supported Formats</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>JSON:</strong> Complete data export from this application</li>
              <li>• <strong>CSV:</strong> Transaction data in comma-separated format</li>
              <li>• <strong>Excel:</strong> Spreadsheet files (.xlsx, .xls)</li>
            </ul>
          </div>

          <div>
            <label className="theme-form-label mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="theme-input transition-all duration-200"
            />
            {importFile && (
              <p className="text-sm theme-text-secondary mt-2">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Importing data will add new transactions to your account. 
              Duplicate transactions may be created if the same data is imported multiple times.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowImportModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDataImport}
              disabled={!importFile || isLoading}
              className="theme-btn-primary text-sm disabled:opacity-50"
            >
              {isLoading ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Delete Account"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <Trash2 className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h4 className="text-lg font-medium text-red-900">Permanent Account Deletion</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
          </div>

          <div className="theme-text-primary">
            <p className="mb-4">
              <strong>Deleting your account will permanently remove:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All your financial transactions and data</li>
              <li>Account settings and preferences</li>
              <li>Goals, budgets, and categories</li>
              <li>Group expenses and lending records</li>
              <li>All uploaded statements and receipts</li>
            </ul>
            <p className="mt-4 text-sm theme-text-secondary">
              <strong>Recommendation:</strong> Export your data before deletion if you want to keep a backup.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAccountDeletion}
              disabled={isLoading}
              className="theme-btn-danger text-sm disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DataSettings;
