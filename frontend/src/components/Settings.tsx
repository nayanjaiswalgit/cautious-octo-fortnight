import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Globe, Shield, Bell, RefreshCw, Settings as SettingsIcon, Mail, Download, Bot, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useTheme } from '../contexts/ThemeContext';
import ProfileSettings from './ProfileSettings';
import PreferencesSettings from './PreferencesSettings';
import SecuritySettings from './SecuritySettings';
import NotificationsSettings from './NotificationsSettings';
import AutomationSettings from './AutomationSettings';
import IntegrationsSettings from './IntegrationsSettings';
import DataSettings from './DataSettings';

// Subscription Management Component
const Subscriptions = () => {
  const [currentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Up to 100 transactions', 'Basic analytics', 'Manual data entry', '1 account'],
      recommended: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingCycle === 'monthly' ? 9.99 : 99.99,
      features: ['Unlimited transactions', 'Advanced analytics', 'Receipt scanning', 'Multiple accounts', 'Export data'],
      recommended: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: billingCycle === 'monthly' ? 19.99 : 199.99,
      features: ['Everything in Pro', 'Priority support', 'Custom categories', 'API access', 'White-label option'],
      recommended: false
    }
  ];
  
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold theme-text-primary mb-2">Subscription Management</h2>
        <p className="theme-text-secondary">Manage your subscription plans and billing settings.</p>
      </div>
      
      {/* Current Plan */}
      <div className="theme-card p-6 mb-6">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Current Plan</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold theme-text-primary">Free Plan</p>
            <p className="theme-text-secondary">You're currently on the free plan</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold theme-text-primary">$0</p>
            <p className="text-sm theme-text-muted">/month</p>
          </div>
        </div>
      </div>
      
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-6">
        <div className="theme-bg-secondary rounded-lg p-1 flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly' ? 'theme-bg-card shadow-sm text-blue-600 dark:text-blue-400' : 'theme-text-muted'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly' ? 'theme-bg-card shadow-sm text-blue-600 dark:text-blue-400' : 'theme-text-muted'
            }`}
          >
            Yearly
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">Save 20%</span>
          </button>
        </div>
      </div>
      
      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`theme-card p-6 relative ${
              plan.recommended ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 text-sm rounded-full">
                  Recommended
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h3 className="text-xl font-semibold theme-text-primary mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold theme-text-primary">${plan.price}</span>
                <span className="theme-text-muted">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>
              
              <ul className="space-y-2 mb-6 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm theme-text-secondary">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  currentPlan === plan.id
                    ? 'theme-bg-secondary theme-text-muted cursor-not-allowed'
                    : plan.recommended
                    ? 'theme-btn-primary'
                    : 'theme-btn-outline'
                }`}
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Billing History */}
      <div className="theme-card p-6 mt-8">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Billing History</h3>
        <div className="text-center py-8">
          <p className="theme-text-muted">No billing history available</p>
          <p className="text-sm theme-text-muted mt-1">Your billing history will appear here once you upgrade to a paid plan</p>
        </div>
      </div>
    </div>
  );
};

const TelegramIntegration = () => (
  <div className="max-w-2xl">
    <div className="mb-8">
      <h2 className="text-xl font-semibold theme-text-primary mb-2">Telegram Bot Admin</h2>
      <p className="theme-text-secondary">Configure and manage the Telegram bot integration.</p>
    </div>
    <div className="theme-card p-8 text-center">
      <Bot className="h-12 w-12 theme-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-medium theme-text-primary mb-2">Telegram Bot Management</h3>
      <p className="theme-text-secondary">This feature is coming soon. You'll be able to configure Telegram bot settings here.</p>
    </div>
  </div>
);

export const Settings = () => {
  const { state: authState } = useAuth();
  const { ToastContainer } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');

  // Check if coming from subscriptions redirect
  useEffect(() => {
    if (location.pathname === '/settings' && location.state?.from === '/subscriptions') {
      setActiveTab('subscriptions');
    }
  }, [location]);

  // Check if user is admin (you can adjust this logic based on your user model)
  const isAdmin = authState.user?.is_staff || authState.user?.is_superuser;

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'preferences', name: 'Preferences', icon: Globe },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'subscriptions', name: 'Subscriptions', icon: RefreshCw },
    { id: 'automation', name: 'Automation', icon: SettingsIcon },
    { id: 'integrations', name: 'Integrations', icon: Mail },
    { id: 'data', name: 'Data & Privacy', icon: Download },
    ...(isAdmin ? [{ id: 'telegram-admin', name: 'Telegram Bot Admin', icon: Bot }] : []),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'notifications':
        return <NotificationsSettings />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'automation':
        return <AutomationSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'data':
        return <DataSettings />;
      case 'telegram-admin':
        return isAdmin ? <TelegramIntegration /> : null;
      default:
        return <ProfileSettings />;
    }
  };

  // Appearance Settings Component
  const AppearanceSettings = () => {
    const { theme, setTheme } = useTheme();
    
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold theme-text-primary mb-2">Appearance</h2>
          <p className="theme-text-secondary">Customize how the application looks and feels.</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium theme-text-primary mb-4">Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'light', label: 'Light Mode', icon: '☀️', description: 'Clean and bright interface' },
                { value: 'dark', label: 'Dark Mode', icon: '🌙', description: 'Easy on the eyes in low light' },
                { value: 'system', label: 'System Default', icon: '💻', description: 'Follow your device settings' },
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={`theme-card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                    theme === option.value ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <h4 className="font-medium theme-text-primary">{option.label}</h4>
                    <p className="text-sm theme-text-muted mt-1">{option.description}</p>
                    {theme === option.value && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                          ✓ Active
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen theme-bg-primary">
      {/* Settings Header */}
      <div className="theme-bg-secondary theme-border-light border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold theme-text-primary">Settings</h1>
          <p className="theme-text-secondary mt-1">Manage your account preferences and application settings</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-120px)]">
        {/* Internal Settings Sidebar */}
        <div className="w-64 theme-bg-card theme-border-light border-r">
          <div className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'theme-text-secondary hover:theme-bg-hover hover:theme-text-primary'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${
                      activeTab === tab.id 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'theme-text-muted'
                    }`} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modals and Toasts */}
      <ToastContainer />
    </div>
  );
};