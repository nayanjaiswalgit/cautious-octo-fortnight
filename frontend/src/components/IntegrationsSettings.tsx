import React from 'react';
import GmailAccounts from './GmailAccounts';

const IntegrationsSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Integrations</h2>
      
      <div>
        <h3 className="text-xl font-semibold theme-text-primary mb-4">Gmail Integration</h3>
        <p className="theme-text-secondary mb-4">Connect your Gmail account to automatically extract and categorize transactions from emails.</p>
        <GmailAccounts />
      </div>
    </div>
  );
};

export default IntegrationsSettings;
