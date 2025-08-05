import React, { useState, useEffect } from 'react';
import { 
  Plus, Minus, ShoppingCart, Star, Zap, Settings, 
  Users, Database, Shield, Crown, Check,
  TrendingUp, Package, Sparkles, Calculator
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from './Toast';
import { Button } from './Button';
import { Card } from './Card';

interface PlanAddon {
  id: number;
  name: string;
  addon_type: string;
  description: string;
  price: string;
  billing_cycle: string;
  credits_amount: number;
  transaction_increase: number;
  account_increase: number;
  storage_gb: number;
  feature_flags: Record<string, boolean>;
  is_stackable: boolean;
  max_quantity: number;
}

interface BasePlan {
  id: number;
  name: string;
  price: string;
  ai_credits_per_month: number;
  max_transactions_per_month: number;
}

interface PlanTemplate {
  id: number;
  name: string;
  description: string;
  base_plan: BasePlan;
  template_addons: Array<{
    addon: PlanAddon;
    quantity: number;
  }>;
  total_price: string;
  discount_percentage: string;
  savings_amount: string;
  is_featured: boolean;
  target_user_types: string[];
}

interface CustomizationPreview {
  base_plan: BasePlan;
  addons: Array<{
    addon: PlanAddon;
    quantity: number;
    monthly_cost: number;
  }>;
  totals: {
    ai_credits: number;
    transactions_limit: number;
    accounts_limit: number;
    monthly_cost: number;
    features: Record<string, boolean>;
  };
}

interface SubscriptionPlan extends BasePlan {
  // Add any other properties specific to SubscriptionPlan if they exist
}

export const PlanCustomizer: React.FC = () => {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [addons, setAddons] = useState<PlanAddon[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BasePlan | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});
  const [preview, setPreview] = useState<CustomizationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'build' | 'templates'>('build');
  const { showSuccess, showError, ToastContainer } = useToast();

  useEffect(() => {
    Promise.all([
      fetchSubscriptionPlans(),
      fetchAddons(),
      fetchTemplates()
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPlan && Object.keys(selectedAddons).length >= 0) {
      updatePreview();
    }
  }, [selectedPlan, selectedAddons]);

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await apiClient.get('/subscription-plans/');
      setSubscriptionPlans(response.data.results || response.data);
      if (!selectedPlan && response.data.length > 0) {
        setSelectedPlan(response.data[1]); // Default to Basic plan
      }
    } catch (error) {
      showError('Failed to load subscription plans');
    }
  };

  const fetchAddons = async () => {
    try {
      const response = await apiClient.get('/plan-addons/');
      setAddons(response.data.results || response.data);
    } catch (error) {
      showError('Failed to load add-ons');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/plan-templates/');
      setTemplates(response.data.results || response.data);
    } catch (error) {
      showError('Failed to load plan templates');
    }
  };

  const updatePreview = async () => {
    if (!selectedPlan) return;

    const addonsData = Object.entries(selectedAddons)
      .filter(([_, quantity]) => quantity > 0)
      .map(([addonId, quantity]) => ({ addon_id: parseInt(addonId), quantity }));

    try {
      const response = await apiClient.get('/plan-customization/preview_customization/', {
        params: {
          base_plan_id: selectedPlan.id,
          addons: JSON.stringify(addonsData)
        }
      });
      setPreview(response.data);
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  };

  const applyCustomization = async () => {
    if (!selectedPlan) return;

    const addonsData = Object.entries(selectedAddons)
      .filter(([_, quantity]) => quantity > 0)
      .map(([addonId, quantity]) => ({ addon_id: parseInt(addonId), quantity }));

    try {
      await apiClient.post('/plan-customization/customize_plan/', {
        base_plan_id: selectedPlan.id,
        addons: addonsData
      });
      showSuccess('Plan customized successfully!');
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to customize plan');
    }
  };

  const applyTemplate = async (template: PlanTemplate) => {
    try {
      await apiClient.post('/plan-customization/apply_template/', {
        template_id: template.id
      });
      showSuccess(`Applied ${template.name} template successfully!`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to apply template');
    }
  };

  const updateAddonQuantity = (addonId: number, change: number) => {
    const addon = addons.find(a => a.id === addonId);
    if (!addon) return;

    const currentQuantity = selectedAddons[addonId] || 0;
    const newQuantity = Math.max(0, Math.min(addon.max_quantity, currentQuantity + change));
    
    setSelectedAddons(prev => ({
      ...prev,
      [addonId]: newQuantity
    }));
  };

  const getAddonIcon = (type: string) => {
    switch (type) {
      case 'credits': return <Zap className="w-5 h-5" />;
      case 'transactions': return <TrendingUp className="w-5 h-5" />;
      case 'accounts': return <Users className="w-5 h-5" />;
      case 'storage': return <Database className="w-5 h-5" />;
      case 'integrations': return <Settings className="w-5 h-5" />;
      case 'support': return <Shield className="w-5 h-5" />;
      case 'features': return <Crown className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getAddonsByCategory = () => {
    const categories: Record<string, PlanAddon[]> = {};
    addons.forEach(addon => {
      const category = addon.addon_type;
      if (!categories[category]) categories[category] = [];
      categories[category].push(addon);
    });
    return categories;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ToastContainer />
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Customize Your Plan</h1>
        <p className="text-lg text-gray-600">
          Build the perfect plan for your needs with our flexible add-ons
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Button
              onClick={() => setActiveTab('build')}
              variant={activeTab === 'build' ? 'primary' : 'ghost'}
              size="sm"
              className="py-2 px-1 border-b-2 rounded-none"
            >
              <Calculator className="w-4 h-4 inline-block mr-2" />
              Build Custom Plan
            </Button>
            <Button
              onClick={() => setActiveTab('templates')}
              variant={activeTab === 'templates' ? 'primary' : 'ghost'}
              size="sm"
              className="py-2 px-1 border-b-2 rounded-none"
            >
              <Star className="w-4 h-4 inline-block mr-2" />
              Pre-built Templates
            </Button>
          </nav>
        </div>
      </div>

      {activeTab === 'build' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Base Plan Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Choose Base Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptionPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`cursor-pointer ${selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      <span className="text-lg font-bold text-blue-600">${plan.price}/mo</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {plan.ai_credits_per_month} AI credits • {plan.max_transactions_per_month.toLocaleString()} transactions
                    </p>
                    {selectedPlan?.id === plan.id && (
                      <div className="flex items-center text-blue-600">
                        <Check className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Add-ons Selection */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Add Optional Features</h2>
              
              {Object.entries(getAddonsByCategory()).map(([category, categoryAddons]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3 capitalize flex items-center">
                    {getAddonIcon(category)}
                    <span className="ml-2">{category.replace('_', ' ')}</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {categoryAddons.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <h4 className="font-medium text-gray-900">{addon.name}</h4>
                            <span className="ml-2 text-sm text-blue-600 font-semibold">
                              ${addon.price}/{addon.billing_cycle}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{addon.description}</p>
                          {addon.max_quantity > 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Max quantity: {addon.max_quantity}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => updateAddonQuantity(addon.id, -1)}
                            disabled={(selectedAddons[addon.id] || 0) <= 0}
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          
                          <span className="w-8 text-center font-medium">
                            {selectedAddons[addon.id] || 0}
                          </span>
                          
                          <Button
                            onClick={() => updateAddonQuantity(addon.id, 1)}
                            disabled={(selectedAddons[addon.id] || 0) >= addon.max_quantity}
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                Plan Preview
              </h3>
              
              {preview && (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">{preview.base_plan.name}</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      ${preview.totals.monthly_cost.toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">AI Credits</span>
                      <span className="font-medium">{preview.totals.ai_credits.toLocaleString()}/month</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transactions</span>
                      <span className="font-medium">{preview.totals.transactions_limit.toLocaleString()}/month</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accounts</span>
                      <span className="font-medium">{preview.totals.accounts_limit}</span>
                    </div>
                  </div>
                  
                  {preview.addons.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">Add-ons</h5>
                      <div className="space-y-2">
                        {preview.addons.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.addon.name} x{item.quantity}
                            </span>
                            <span className="font-medium">+${item.monthly_cost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={applyCustomization}
                    className="w-full mt-6 flex items-center justify-center"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Apply Customization
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        // Templates Tab
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all hover:shadow-md ${
                template.is_featured ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
              }`}
            >
              {template.is_featured && (
                <div className="flex items-center mb-3">
                  <Star className="w-4 h-4 text-purple-600 mr-1" />
                  <span className="text-sm font-medium text-purple-600">Featured</span>
                </div>
              )}
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-gray-600 mb-4">{template.description}</p>
              
              <div className="mb-4">
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-blue-600">${template.total_price}</span>
                  <span className="text-sm text-gray-500 ml-1">/month</span>
                  {parseFloat(template.savings_amount) > 0 && (
                    <span className="ml-2 text-sm text-green-600 font-medium">
                      Save ${template.savings_amount}
                    </span>
                  )}
                </div>
                {parseFloat(template.discount_percentage) > 0 && (
                  <div className="text-sm text-green-600">
                    {template.discount_percentage}% discount applied
                  </div>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <strong>Base:</strong> {template.base_plan.name}
                </div>
                {template.template_addons.map((item, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    • {item.addon.name} x{item.quantity}
                  </div>
                ))}
              </div>
              
              <Button
                onClick={() => applyTemplate(template)}
                className="w-full"
              >
                Apply Template
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};