import React, { useState } from 'react';
// import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { Save } from 'lucide-react';

const SecuritySettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    if (passwordData.new_password.length < 8) {
      showError('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    
    try {
      await apiClient.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
      showSuccess('Password Changed', 'Your password has been updated successfully.');
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Password change failed:', error);
      showError('Password Change Failed', 'Unable to change your password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Security Settings</h2>
      
      {/* Change Password Section */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium theme-text-primary">Password</h3>
            <p className="text-sm theme-text-secondary">Keep your account secure with a strong password</p>
          </div>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="theme-btn-outline text-sm"
          >
            {showPasswordChange ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordChange && (
          <div className="theme-card p-6 mt-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="theme-form-label mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                className="theme-input transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="theme-form-label mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                className="theme-input transition-all duration-200"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="theme-form-label mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="theme-input transition-all duration-200"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="theme-btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium theme-text-primary">Two-Factor Authentication</h3>
            <p className="text-sm theme-text-secondary">Add an extra layer of security to your account</p>
          </div>
          <span className="px-3 py-1 theme-bg-secondary theme-text-muted text-sm rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
