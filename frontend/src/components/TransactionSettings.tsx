import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Select } from './Select';
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
        <Card>
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Default Transaction Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Select
                label="Default Transaction Source"
                value={settings.default_transaction_source}
                onChange={(e) => setSettings({ ...settings, default_transaction_source: e.target.value })}
                options={[
                  { value: 'manual', label: 'Manual Entry' },
                  { value: 'pdf_import', label: 'PDF Import' },
                  { value: 'csv_import', label: 'CSV Import' },
                  { value: 'api', label: 'API Integration' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Default Tags (comma-separated)"
                type="text"
                value={settings.default_tags}
                onChange={(e) => setSettings({ ...settings, default_tags: e.target.value })}
                placeholder="e.g., expense, business, personal"
              />
            </div>
          </div>
        </Card>

        {/* Automation Settings */}
        <Card>
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Automation & Processing
          </h2>
          
          <div className="space-y-4">
            <Checkbox
              label="Auto-categorize transactions using machine learning"
              checked={settings.auto_categorize_transactions}
              onChange={(e) => setSettings({ ...settings, auto_categorize_transactions: e.target.checked })}
            />

            <Checkbox
              label="Require manual verification for imported transactions"
              checked={settings.require_verification}
              onChange={(e) => setSettings({ ...settings, require_verification: e.target.checked })}
            />

            <Checkbox
              label="Show smart suggestions for similar transactions"
              checked={settings.enable_transaction_suggestions}
              onChange={(e) => setSettings({ ...settings, enable_transaction_suggestions: e.target.checked })}
            />

            <Checkbox
              label="Automatically detect and mark transfers between accounts"
              checked={settings.auto_mark_transfers}
              onChange={(e) => setSettings({ ...settings, auto_mark_transfers: e.target.checked })}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Minimum Transfer Amount ($)"
                type="number"
                min="0"
                step="0.01"
                value={settings.minimum_transfer_amount}
                onChange={(e) => setSettings({ ...settings, minimum_transfer_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
        </Card>

        {/* Duplicate Detection */}
        <Card>
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Duplicate Detection
          </h2>
          
          <div className="space-y-4">
            <Checkbox
              label="Enable duplicate transaction detection"
              checked={settings.duplicate_detection_enabled}
              onChange={(e) => setSettings({ ...settings, duplicate_detection_enabled: e.target.checked })}
            />

            {settings.duplicate_detection_enabled && (
              <div>
                <Select
                  label="Detection Window (days)"
                  value={settings.duplicate_detection_days}
                  onChange={(e) => setSettings({ ...settings, duplicate_detection_days: parseInt(e.target.value) })}
                  options={[
                    { value: 1, label: '1 day' },
                    { value: 3, label: '3 days' },
                    { value: 7, label: '7 days' },
                    { value: 14, label: '14 days' },
                    { value: 30, label: '30 days' },
                  ]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Look for duplicates within this time window
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Receipt Processing */}
        <Card>
          <h2 className="text-xl font-semibold theme-text-primary mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Receipt Processing
          </h2>
          
          <div className="space-y-4">
            <Checkbox
              label="Enable receipt scanning and OCR processing"
              checked={settings.enable_receipt_scanning}
              onChange={(e) => setSettings({ ...settings, enable_receipt_scanning: e.target.checked })}
            />

            <Checkbox
              label="Automatically create transactions from processed receipts"
              checked={settings.auto_create_from_receipts}
              onChange={(e) => setSettings({ ...settings, auto_create_from_receipts: e.target.checked })}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button
          type="submit"
          disabled={loading}
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </Button>
        </div>
      </form>
    </div>
  );
};