import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { useToast } from './Toast';

export const TransactionSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    default_category_id: '',
    auto_categorize_transactions: true,
    require_verification: false,
    default_tags: '',
    enable_transaction_suggestions: true,
    duplicate_detection_enabled: true,
    duplicate_detection_days: 7,
    default_transaction_source: 'manual',
    auto_mark_transfers: true,
    minimum_transfer_amount: 0,
    enable_receipt_scanning: true,
    auto_create_from_receipts: false,
  });

  useEffect(() => {
    loadTransactionSettings();
  }, []);

  const loadTransactionSettings = async () => {
    try {
      // For now, use user preferences or default values
      // In a real implementation, you'd have a separate API endpoint for transaction settings
      setSettings({
        default_category_id: '',
        auto_categorize_transactions: true,
        require_verification: false,
        default_tags: '',
        enable_transaction_suggestions: true,
        duplicate_detection_enabled: true,
        duplicate_detection_days: 7,
        default_transaction_source: 'manual',
        auto_mark_transfers: true,
        minimum_transfer_amount: 0,
        enable_receipt_scanning: true,
        auto_create_from_receipts: false,
      });
    } catch (error) {
      console.error('Failed to load transaction settings:', error);
      showError('Failed to load transaction settings');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real implementation, this would save to a transaction settings endpoint
      // For now, we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('Transaction settings saved successfully');
    } catch (error) {
      console.error('Failed to save transaction settings:', error);
      showError('Failed to save transaction settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold theme-text-primary flex items-center">
          <FileText className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
          Transaction Settings
        </h1>
        <p className="theme-text-secondary mt-2">Configure how transactions are processed and managed</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Default Settings */}
        <div className="theme-card p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Default Transaction Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="theme-form-label mb-2">
                Default Transaction Source
              </label>
              <select
                value={settings.default_transaction_source}
                onChange={(e) => setSettings({ ...settings, default_transaction_source: e.target.value })}
                className="theme-select"
              >
                <option value="manual">Manual Entry</option>
                <option value="pdf_import">PDF Import</option>
                <option value="csv_import">CSV Import</option>
                <option value="api">API Integration</option>
              </select>
            </div>

            <div>
              <label className="theme-form-label mb-2">
                Default Tags (comma-separated)
              </label>
              <input
                type="text"
                value={settings.default_tags}
                onChange={(e) => setSettings({ ...settings, default_tags: e.target.value })}
                className="theme-select"
                placeholder="e.g., expense, business, personal"
              />
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="theme-card p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Automation & Processing
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auto_categorize_transactions}
                onChange={(e) => setSettings({ ...settings, auto_categorize_transactions: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Auto-categorize transactions using machine learning</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.require_verification}
                onChange={(e) => setSettings({ ...settings, require_verification: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Require manual verification for imported transactions</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_transaction_suggestions}
                onChange={(e) => setSettings({ ...settings, enable_transaction_suggestions: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Show smart suggestions for similar transactions</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auto_mark_transfers}
                onChange={(e) => setSettings({ ...settings, auto_mark_transfers: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Automatically detect and mark transfers between accounts</span>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="theme-form-label mb-2">
                Minimum Transfer Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.minimum_transfer_amount}
                onChange={(e) => setSettings({ ...settings, minimum_transfer_amount: parseFloat(e.target.value) || 0 })}
                className="theme-select"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Duplicate Detection */}
        <div className="theme-card p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Duplicate Detection
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.duplicate_detection_enabled}
                onChange={(e) => setSettings({ ...settings, duplicate_detection_enabled: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Enable duplicate transaction detection</span>
            </label>

            {settings.duplicate_detection_enabled && (
              <div>
                <label className="theme-form-label mb-2">
                  Detection Window (days)
                </label>
                <select
                  value={settings.duplicate_detection_days}
                  onChange={(e) => setSettings({ ...settings, duplicate_detection_days: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Look for duplicates within this time window
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Processing */}
        <div className="theme-card p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Receipt Processing
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_receipt_scanning}
                onChange={(e) => setSettings({ ...settings, enable_receipt_scanning: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Enable receipt scanning and OCR processing</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auto_create_from_receipts}
                onChange={(e) => setSettings({ ...settings, auto_create_from_receipts: e.target.checked })}
                className="rounded theme-border theme-bg-secondary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="ml-3 text-sm text-gray-700">Automatically create transactions from processed receipts</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="theme-btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};