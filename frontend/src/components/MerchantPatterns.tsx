import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { FormModal } from './FormModal';
import { StatusBadge } from './StatusBadge';
import { apiClient } from '../api/client';

interface MerchantPattern {
  id: number;
  pattern: string;
  kind: string;
  merchant_name: string;
  category: number;
  category_name?: string;
  confidence: number;
  is_active: boolean;
  usage_count: number;
  last_used: string | null;
  created_at: string;
}

const MerchantPatterns: React.FC = () => {
  const [patterns, setPatterns] = useState<MerchantPattern[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<MerchantPattern | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    loadPatterns();
    loadCategories();
  }, []);

  const loadPatterns = async () => {
    try {
      const response = await apiClient.getMerchantPatterns();
      setPatterns(response);
    } catch (error) {
      console.error('Error loading merchant patterns:', error);
      toast.error('Failed to load merchant patterns');
    } finally {
      setLoading(false);
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

  const createPattern = async (data: any) => {
    try {
      await apiClient.createMerchantPattern(data);
      toast.success('Merchant pattern created successfully!');
      setShowCreateModal(false);
      loadPatterns();
    } catch (error: any) {
      console.error('Error creating pattern:', error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to create merchant pattern');
      }
    }
  };

  const updatePattern = async (data: any) => {
    if (!editingPattern) return;
    
    try {
      await apiClient.updateMerchantPattern(editingPattern.id, data);
      toast.success('Merchant pattern updated successfully!');
      setEditingPattern(null);
      loadPatterns();
    } catch (error: any) {
      console.error('Error updating pattern:', error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat();
        toast.error(errorMessages.join(', '));
      } else {
        toast.error('Failed to update merchant pattern');
      }
    }
  };

  const deletePattern = async (pattern: MerchantPattern) => {
    if (!confirm('Are you sure you want to delete this merchant pattern?')) return;
    
    try {
      await apiClient.deleteMerchantPattern(pattern.id);
      toast.success('Merchant pattern deleted');
      loadPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Failed to delete merchant pattern');
    }
  };

  const togglePatternStatus = async (pattern: MerchantPattern) => {
    try {
      await apiClient.updateMerchantPattern(pattern.id, {
        is_active: !pattern.is_active
      });
      toast.success(`Pattern ${pattern.is_active ? 'disabled' : 'enabled'}`);
      loadPatterns();
    } catch (error) {
      console.error('Error toggling pattern status:', error);
      toast.error('Failed to update pattern status');
    }
  };

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = searchTerm === '' || 
      pattern.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.kind.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterActive === null || pattern.is_active === filterActive;
    
    return matchesSearch && matchesFilter;
  });


  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant Pattern Management</h1>
          <p className="text-gray-600">
            Manage patterns to automatically recognize merchants and improve transaction categorization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ➕ Add Pattern
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search patterns, merchants, or types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(null)}
            className={`px-4 py-2 text-sm rounded-lg ${
              filterActive === null 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-4 py-2 text-sm rounded-lg ${
              filterActive === true 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-4 py-2 text-sm rounded-lg ${
              filterActive === false 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Patterns List */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm || filterActive !== null ? 'No patterns match your filters' : 'No merchant patterns yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterActive !== null 
              ? 'Try adjusting your search or filters'
              : 'Create patterns to help automatically categorize transactions from specific merchants'
            }
          </p>
          {!searchTerm && filterActive === null && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Pattern
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatterns.map((pattern) => (
                  <tr key={pattern.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {pattern.pattern}
                        </div>
                        <div className="text-sm text-gray-500">{pattern.kind}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pattern.merchant_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pattern.category_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">
                        Confidence: {Math.round(pattern.confidence * 100)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pattern.usage_count} times</div>
                      {pattern.last_used && (
                        <div className="text-sm text-gray-500">
                          Last: {new Date(pattern.last_used).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge 
                        status={pattern.is_active ? 'active' : 'inactive'}
                        className={pattern.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingPattern(pattern)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => togglePatternStatus(pattern)}
                        className={pattern.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                      >
                        {pattern.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deletePattern(pattern)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {patterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Patterns</h3>
            <p className="text-2xl font-bold text-gray-900">{patterns.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Patterns</h3>
            <p className="text-2xl font-bold text-green-600">
              {patterns.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Usage</h3>
            <p className="text-2xl font-bold text-blue-600">
              {patterns.reduce((sum, p) => sum + p.usage_count, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Confidence</h3>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round((patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length) * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal || editingPattern !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPattern(null);
        }}
        title={editingPattern ? 'Edit Merchant Pattern' : 'Create Merchant Pattern'}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = {
            pattern: formData.get('pattern'),
            merchant_name: formData.get('merchant_name'),
            kind: formData.get('kind'),
            category: parseInt(formData.get('category') as string),
            confidence: parseFloat(formData.get('confidence') as string),
            is_active: formData.get('is_active') === 'on'
          };
          if (editingPattern) {
            updatePattern(data);
          } else {
            createPattern(data);
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Pattern *
            </label>
            <input
              type="text"
              name="pattern"
              defaultValue={editingPattern?.pattern || ''}
              placeholder="e.g., AMZN Mktp, STARBUCKS, TST* Restaurant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant Name *
            </label>
            <input
              type="text"
              name="merchant_name"
              defaultValue={editingPattern?.merchant_name || ''}
              placeholder="e.g., Amazon, Starbucks, Test Restaurant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
            <input
              type="text"
              name="kind"
              defaultValue={editingPattern?.kind || ''}
              placeholder="e.g., online_purchase, coffee_shop, restaurant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Category *
            </label>
            <select
              name="category"
              defaultValue={editingPattern?.category || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence Score *
            </label>
            <input
              type="number"
              name="confidence"
              defaultValue={editingPattern?.confidence || 0.8}
              min="0"
              max="1"
              step="0.1"
              placeholder="0.8"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingPattern?.is_active ?? true}
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
                setEditingPattern(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {editingPattern ? 'Update Pattern' : 'Create Pattern'}
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default MerchantPatterns;