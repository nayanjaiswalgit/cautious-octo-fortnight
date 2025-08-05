import React from 'react';
import AutomationRules from './AutomationRules';
import MerchantPatterns from './MerchantPatterns';

const AutomationSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Automation Settings</h2>
      
      <div>
        <h3 className="text-xl font-semibold theme-text-primary mb-4">Transaction Processing Rules</h3>
        <p className="theme-text-secondary mb-4">Set up rules to automatically categorize, tag, or modify transactions based on custom criteria.</p>
        <AutomationRules />
      </div>

      <div className="pt-8 theme-border-light border-t">
        <h3 className="text-xl font-semibold theme-text-primary mb-4">Merchant Categorization Patterns</h3>
        <p className="theme-text-secondary mb-4">Manage patterns for merchants to ensure consistent categorization of your spending.</p>
        <MerchantPatterns />
      </div>
    </div>
  );
};

export default AutomationSettings;
