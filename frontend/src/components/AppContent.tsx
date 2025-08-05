import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Login } from './Login';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { TransactionTable } from './TransactionTable';
import { Goals } from './Goals';
import { AccountsManagement } from './AccountsManagement';
import { SocialFinance } from './SocialFinance';
import { Settings } from './Settings';
import { StatementViewer } from './StatementViewer';
import { UploadHistory } from './UploadHistory';
// Profile component removed - now accessed through Settings
import { TransactionSettings } from './TransactionSettings';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';
import { CookieConsent } from './CookieConsent';
import GmailCallback from './GmailCallback';
import { GoogleCallback } from './GoogleCallback';


// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { state: authState } = useAuth();
  const location = useLocation();

  if (authState.isLoading) {
    return <LoadingSpinner />;
  }

  if (!authState.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Main App Layout with Routes
const AppLayout = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionTable />} />
        <Route path="/accounts" element={<AccountsManagement />} />
        <Route path="/subscriptions" element={<Navigate to="/settings" replace />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/social" element={<SocialFinance />} />
        <Route path="/gmail-callback" element={<GmailCallback />} />
        <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/upload-history" element={<UploadHistory />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
        <Route path="/transaction-settings" element={<TransactionSettings />} />
        <Route path="/statement-viewer" element={<StatementViewer />} />
        
        {/* Redirects for old routes to merged pages */}
        <Route path="/upload" element={<Navigate to="/accounts" replace />} />
        <Route path="/group-expenses" element={<Navigate to="/social" replace />} />
        <Route path="/lending" element={<Navigate to="/social" replace />} />
        <Route path="/invoices" element={<Navigate to="/accounts" replace />} />
        <Route path="/gmail" element={<Navigate to="/settings" replace />} />
        <Route path="/telegram" element={<Navigate to="/settings" replace />} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export function AppContent() {
  const { state: authState } = useAuth();
  const { fetchAccounts, fetchCategories, fetchGoals } = useData();

  useEffect(() => {
    if (authState.user && !authState.isLoading) {
      // Initialize app data when user is authenticated
      fetchAccounts();
      fetchCategories();
      fetchGoals();
    }
  }, [authState.user, authState.isLoading, fetchAccounts, fetchCategories, fetchGoals]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
      <CookieConsent />
    </ErrorBoundary>
  );
}