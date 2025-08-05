import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';
import { FormModal } from './FormModal';
import { StatusBadge } from './StatusBadge';
import { apiClient } from '../api/client';

interface ProcessingRule {
  id: number;
  name: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

interface RuleChoices {
  condition_fields: [string, string][];
  condition_operators: [string, string][];
  action_types: [string, string][];
}

interface TestResult {
  matches_count: number;
  matches: Array<{
    id: number;
    description: string;
    amount: string;
    date: string;
    current_category: string | null;
  }>;
  total_tested: number;
}

const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<ProcessingRule[]>([]);
  const [choices, setChoices] = useState<RuleChoices | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ProcessingRule | null>(null);
  const [testingRule, setTestingRule] = useState<ProcessingRule | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    loadRules();
    loadChoices();
    loadCategories();
  }, []);

  const loadRules = async () => {
    try {
      const response = await apiClient.getProcessingRules();
      setRules(response);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const loadChoices = async () => {
    try {
      const response = await apiClient.getProcessingRuleChoices();
      setChoices(response);
    } catch (error) {
      console.error('Error loading choices:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const createRule = async (data: any) => {
    try {
      await apiClient.createProcessingRule(data);
      toast.success('Automation rule created successfully!');
      setShowCreateModal(false);
      loadRules();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to create automation rule');
      }
    }
  };

  const updateRule = async (data: any) => {
    if (!editingRule) return;
    
    try {
      await apiClient.updateProcessingRule(editingRule.id, data);
      toast.success('Automation rule updated successfully!');
      setEditingRule(null);
      loadRules();
    } catch (error: any) {
      console.error('Error updating rule:', error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to update automation rule');
      }
    }
  };

  const deleteRule = async (rule: ProcessingRule) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    
    try {
      await apiClient.deleteProcessingRule(rule.id);
      toast.success('Automation rule deleted');
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete automation rule');
    }
  };

  const toggleRuleStatus = async (rule: ProcessingRule) => {
    try {
      await apiClient.updateProcessingRule(rule.id, {
        is_active: !rule.is_active
      });
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
      loadRules();
    } catch (error) {
      console.error('Error toggling rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const testRule = async (rule: ProcessingRule) => {
    setTestingRule(rule);
    try {
      const response = await apiClient.testProcessingRule(rule.id);
      setTestResult(response);
    } catch (error) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  const applyToExisting = async (rule: ProcessingRule) => {
    if (!confirm('Apply this rule to all existing transactions? This action cannot be undone.')) return;
    
    try {
      const response = await apiClient.applyProcessingRuleToExisting(rule.id);
      toast.success(response.message);
    } catch (error) {
      console.error('Error applying rule:', error);
      toast.error('Failed to apply rule to existing transactions');
    }
  };

  const reorderRules = async (newOrder: ProcessingRule[]) => {
    try {
      const ruleIds = newOrder.map(rule => rule.id);
      await apiClient.reorderProcessingRules(ruleIds);
      setRules(newOrder);
      toast.success('Rules reordered successfully');
    } catch (error) {
      console.error('Error reordering rules:', error);
      toast.error('Failed to reorder rules');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex) {
      const newRules = [...rules];
      const draggedRule = newRules[dragIndex];
      newRules.splice(dragIndex, 1);
      newRules.splice(dropIndex, 0, draggedRule);
      
      // Update priorities
      const updatedRules = newRules.map((rule, index) => ({
        ...rule,
        priority: rules.length - index
      }));
      
      reorderRules(updatedRules);
    }
    setDragging(false);
  };

  const getChoiceLabel = (choices: [string, string][], value: string) => {
    const choice = choices?.find(([key]) => key === value);
    return choice ? choice[1] : value;
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Automation Rules</h1>
          <p className="text-gray-600">
            Automatically categorize and organize your transactions based on custom rules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ➕ Create Rule
        </button>
      </div>

      {/* Rules Priority Info */}
      {rules.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Rule Priority</h3>
          <p className="text-sm text-blue-700">
            Rules are applied in order from top to bottom. Higher priority rules are processed first.
            Drag and drop to reorder rules.
          </p>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No automation rules yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first rule to automatically organize your transactions
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-all cursor-move ${
                dragging ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <span className="text-sm text-gray-500">Priority: {rule.priority}</span>
                    <StatusBadge 
                      status={rule.is_active ? 'active' : 'inactive'}
                      variant={rule.is_active ? 'success' : 'default'}
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>When:</strong> {getChoiceLabel(choices?.condition_fields || [], rule.condition_field)} {' '}
                      {getChoiceLabel(choices?.condition_operators || [], rule.condition_operator)} "{rule.condition_value}"
                    </p>
                    <p>
                      <strong>Then:</strong> {getChoiceLabel(choices?.action_types || [], rule.action_type)} 
                      {rule.action_type === 'set_category' && (
                        <span> to "{categories.find(c => c.id.toString() === rule.action_value)?.name || rule.action_value}"</span>
                      )}
                      {rule.action_type !== 'set_category' && <span> "{rule.action_value}"</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testRule(rule)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleRuleStatus(rule)}
                    className={`px-3 py-1 text-sm rounded ${
                      rule.is_active 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => applyToExisting(rule)}
                    disabled={!rule.is_active}
                    className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply to Existing
                  </button>
                  <button
                    onClick={() => deleteRule(rule)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal || editingRule !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        title={editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = {
            name: formData.get('name'),
            condition_field: formData.get('condition_field'),
            condition_operator: formData.get('condition_operator'),
            condition_value: formData.get('condition_value'),
            action_type: formData.get('action_type'),
            action_value: formData.get('action_value'),
            is_active: formData.get('is_active') === 'on'
          };
          if (editingRule) {
            updateRule(data);
          } else {
            createRule(data);
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingRule?.name || ''}
              placeholder="e.g., Categorize Amazon purchases"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Field *
            </label>
            <select
              name="condition_field"
              defaultValue={editingRule?.condition_field || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Field</option>
              {choices?.condition_fields?.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition *
            </label>
            <select
              name="condition_operator"
              defaultValue={editingRule?.condition_operator || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Condition</option>
              {choices?.condition_operators?.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value *
            </label>
            <input
              type="text"
              name="condition_value"
              defaultValue={editingRule?.condition_value || ''}
              placeholder="e.g., AMZN, Starbucks, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action *
            </label>
            <select
              name="action_type"
              defaultValue={editingRule?.action_type || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Action</option>
              {choices?.action_types?.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Value *
            </label>
            {(editingRule?.action_type === 'set_category' || (!editingRule && categories.length > 0)) ? (
              <select
                name="action_value"
                defaultValue={editingRule?.action_value || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="action_value"
                defaultValue={editingRule?.action_value || ''}
                placeholder="Action value"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            )}
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingRule?.is_active ?? true}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingRule(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Test Results Modal */}
      <Modal
        isOpen={testingRule !== null}
        onClose={() => {
          setTestingRule(null);
          setTestResult(null);
        }}
        title={`Test Results: ${testingRule?.name}`}
        size="lg"
      >
        {testResult && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Summary</h3>
              <p className="text-sm text-blue-700">
                Found {testResult.matches_count} matching transactions out of {testResult.total_tested} tested.
              </p>
            </div>
            
            {testResult.matches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Sample Matches (showing first 10):
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResult.matches.map((match) => (
                    <div key={match.id} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="font-medium">{match.description}</div>
                      <div className="text-gray-600">
                        Amount: ${match.amount} | Date: {new Date(match.date).toLocaleDateString()}
                        {match.current_category && ` | Current Category: ${match.current_category}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {testResult.matches_count === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions match this rule. Consider adjusting the conditions.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AutomationRules;