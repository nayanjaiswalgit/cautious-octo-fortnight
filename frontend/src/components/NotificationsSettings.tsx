import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { Save } from 'lucide-react';

const NotificationsSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    enable_notifications: authState.user?.enable_notifications ?? true,
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updatedUser = await apiClient.updateUserPreferences(profileData);
      updateUser(updatedUser);
      showSuccess('Notification Settings Updated', 'Your notification preferences have been saved successfully.');
    } catch (error) {
      console.error('Notification settings update failed:', error);
      showError('Update Failed', 'Unable to update your notification settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Notification Settings</h2>
      
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-center p-4 theme-bg-secondary rounded-lg theme-border border shadow-sm">
            <input
              type="checkbox"
              checked={profileData.enable_notifications}
              onChange={(e) => setProfileData(prev => ({ ...prev, enable_notifications: e.target.checked }))}
              className="h-5 w-5 text-blue-600 dark:text-blue-400 theme-border rounded focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="ml-4 text-lg font-medium theme-text-primary">Enable Email Notifications</span>
          </label>
          
          <p className="text-sm theme-text-secondary ml-9">
            Receive notifications about account activity, transaction updates, and important alerts directly to your email.
          </p>
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

export default NotificationsSettings;
