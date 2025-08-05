import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { Button } from './Button';
import { Select } from './Select';
import { CurrencyField } from './CurrencyField';
import { Save } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Select';

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
            <Select
              label="Preferred Currency"
              value={profileData.preferred_currency}
              onChange={(e) => setProfileData(prev => ({ ...prev, preferred_currency: e.target.value }))}
              options={currencies.map(currency => ({ value: currency.code, label: `${currency.symbol} ${currency.name} (${currency.code})` }))}
            />
          </div>

          <div>
            <Select
              label="Date Format"
              value={profileData.preferred_date_format}
              onChange={(e) => setProfileData(prev => ({ ...prev, preferred_date_format: e.target.value }))}
              options={dateFormats}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
          >
            <Save className="h-5 w-5" />
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesSettings;
