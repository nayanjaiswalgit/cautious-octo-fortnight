import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { Save } from 'lucide-react';

const PreferencesSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    preferred_currency: authState.user?.preferred_currency || 'USD',
    preferred_date_format: authState.user?.preferred_date_format || 'YYYY-MM-DD',
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  ];

  const dateFormats = [
    { value: 'YYYY-MM-DD', label: '2024-12-31 (ISO)' },
    { value: 'MM/DD/YYYY', label: '12/31/2024 (US)' },
    { value: 'DD/MM/YYYY', label: '31/12/2024 (UK)' },
    { value: 'DD.MM.YYYY', label: '31.12.2024 (DE)' },
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updatedUser = await apiClient.updateUserPreferences(profileData);
      updateUser(updatedUser);
      showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
    } catch (error) {
      console.error('Preferences update failed:', error);
      showError('Update Failed', 'Unable to update your preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Preferences</h2>
      
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="theme-form-label mb-2">
              Preferred Currency
            </label>
            <select
              value={profileData.preferred_currency}
              onChange={(e) => setProfileData(prev => ({ ...prev, preferred_currency: e.target.value }))}
              className="theme-select"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="theme-form-label mb-2">
              Date Format
            </label>
            <select
              value={profileData.preferred_date_format}
              onChange={(e) => setProfileData(prev => ({ ...prev, preferred_date_format: e.target.value }))}
              className="theme-select"
            >
              {dateFormats.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="theme-btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesSettings;
