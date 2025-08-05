import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';
import { FormModal } from './FormModal';
import { StatusBadge } from './StatusBadge';
import { apiClient } from '../api/client';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { Category } from '../types';

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

interface RuleFormData {
  name: FormDataEntryValue | null;
  condition_field: FormDataEntryValue | null;
  condition_operator: FormDataEntryValue | null;
  condition_value: FormDataEntryValue | null;
  action_type: FormDataEntryValue | null;
  action_value: FormDataEntryValue | null;
  is_active: boolean;
}

const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<ProcessingRule[]>([]);
  const [choices, setChoices] = useState<RuleChoices | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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
      setRules(response as ProcessingRule[]);
    } catch (error: unknown) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const loadChoices = async () => {
    try {
      const response = await apiClient.getProcessingRuleChoices();
      setChoices(response as RuleChoices);
    } catch (error: unknown) {
      console.error('Error loading choices:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      setCategories(response as Category[]);
    } catch (error: unknown) {
      console.error('Error loading categories:', error);
    }
  };

  const createRule = async (data: RuleFormData) => {
    try {
      await apiClient.createProcessingRule(data);
      toast.success('Automation rule created successfully!');
      setShowCreateModal(false);
      loadRules();
    } catch (error: unknown) {
      console.error('Error creating rule:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to create automation rule');
      }
    }
  };

  const updateRule = async (data: RuleFormData) => {
    if (!editingRule) return;
    
    try {
      await apiClient.updateProcessingRule(editingRule.id, data);
      toast.success('Automation rule updated successfully!');
      setEditingRule(null);
      loadRules();
    } catch (error: unknown) {
      console.error('Error updating rule:', error);
      const err = error as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat();
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Error toggling rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const testRule = async (rule: ProcessingRule) => {
    setTestingRule(rule);
    try {
      const response = await apiClient.testProcessingRule(rule.id);
      setTestResult(response as TestResult);
    } catch (error: unknown) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  const applyToExisting = async (rule: ProcessingRule) => {
    if (!confirm('Apply this rule to all existing transactions? This action cannot be undone.')) return;
    
    try {
      const response = await apiClient.applyProcessingRuleToExisting(rule.id);
      toast.success((response as { message: string }).message || 'Rule applied successfully');
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
        >
          ➕ Create Rule
        </Button>
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
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Rule
          </Button>
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
                  <Button
                    onClick={() => testRule(rule)}
                    size="sm"
                    variant="secondary"
                  >
                    Test
                  </Button>
                  <Button
                    onClick={() => setEditingRule(rule)}
                    size="sm"
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => toggleRuleStatus(rule)}
                    size="sm"
                    variant={rule.is_active ? 'secondary' : 'success'}
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    onClick={() => applyToExisting(rule)}
                    disabled={!rule.is_active}
                    size="sm"
                    variant="info"
                  >
                    Apply to Existing
                  </Button>
                  <Button
                    onClick={() => deleteRule(rule)}
                    size="sm"
                    variant="danger"
                  >
                    Delete
                  </Button>
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
        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data: RuleFormData = {
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
          <Input
            label="Rule Name"
            type="text"
            name="name"
            defaultValue={editingRule?.name || ''}
            placeholder="e.g., Categorize Amazon purchases"
            required
          />
          
          <Select
            label="Check Field"
            name="condition_field"
            defaultValue={editingRule?.condition_field || ''}
            required
            options={choices?.condition_fields?.map(([value, label]) => ({ value, label })) || []}
          />
          
          <Select
            label="Condition"
            name="condition_operator"
            defaultValue={editingRule?.condition_operator || ''}
            required
            options={choices?.condition_operators?.map(([value, label]) => ({ value, label })) || []}
          />
          
          <Input
            label="Value"
            type="text"
            name="condition_value"
            defaultValue={editingRule?.condition_value || ''}
            placeholder="e.g., AMZN, Starbucks, etc."
            required
          />
          
          <Select
            label="Action"
            name="action_type"
            defaultValue={editingRule?.action_type || ''}
            required
            options={choices?.action_types?.map(([value, label]) => ({ value, label })) || []}
          />
          
          <Select
            label="Action Value"
            name="action_value"
            defaultValue={editingRule?.action_value || ''}
            required
            options={categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
          />
          
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
            <Button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingRule(null);
              }}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
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