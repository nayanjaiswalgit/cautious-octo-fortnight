import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../api/client';
import { User, Camera, Save } from 'lucide-react';

const ProfileSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: authState.user?.full_name || '',
    email: authState.user?.email || '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updatedUser = await apiClient.updateUserPreferences(profileData);
      updateUser(updatedUser);
      showSuccess('Profile Updated', 'Your profile settings have been saved successfully.');
    } catch (error) {
      console.error('Profile update failed:', error);
      showError('Update Failed', 'Unable to update your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'Profile picture must be smaller than 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please upload an image file.');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const updatedUser = await apiClient.updateUserPreferences(formData);
      updateUser(updatedUser);
      showSuccess('Profile Picture Updated', 'Your profile picture has been updated.');
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      showError('Upload Failed', 'Unable to upload profile picture.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Profile Information</h2>
      
      {/* Profile Picture */}
      <div className="flex items-center space-x-6 mb-8">
        <div className="relative">
          <div className="h-24 w-24 rounded-full theme-bg-secondary flex items-center justify-center overflow-hidden shadow-inner">
            {authState.user?.profile_picture ? (
              <img 
                src={authState.user.profile_picture} 
                alt="Profile" 
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 theme-text-muted" />
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full p-2 cursor-pointer transition-colors duration-200 shadow-md">
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <h3 className="text-xl font-semibold theme-text-primary">{profileData.full_name || 'Your Name'}</h3>
          <p className="theme-text-secondary">{profileData.email}</p>
          <p className="text-sm theme-text-muted mt-1">Click the camera icon to change your profile picture</p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="theme-form-label mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
              className="theme-input"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="theme-form-label mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="theme-input"
              placeholder="your.email@example.com"
            />
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

export default ProfileSettings;
