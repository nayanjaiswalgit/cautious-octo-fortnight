import React, { useState, useEffect } from 'react';
import { Zap, FileText, Download, Eye, Trash2, Plus, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from './Toast';
import { Modal } from './Modal';

interface Invoice {
  id: number;
  invoice_type: string;
  invoice_number: string;
  status: string;
  client_name: string;
  client_email: string;
  client_address: string;
  description: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  generated_by_ai: boolean;
  pdf_file?: string;
  created_at: string;
}

interface UserSubscription {
  ai_credits_remaining: number;
  plan: {
    name: string;
    features: Record<string, boolean>;
  };
}

export const AIInvoiceGenerator: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { showSuccess, showError, ToastContainer } = useToast();

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_address: '',
    description: '',
    amount: '',
    tax_amount: '0',
    due_date: '',
    invoice_type: 'invoice'
  });

  useEffect(() => {
    fetchInvoices();
    fetchSubscription();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.get('/invoices/');
      setInvoices(response.data.results || response.data);
    } catch (error) {
      showError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await apiClient.get('/subscriptions/current/');
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const generateInvoiceWithAI = async () => {
    if (!subscription?.plan.features.ai_invoice_generation) {
      showError('AI invoice generation is not available in your current plan');
      return;
    }

    if (subscription.ai_credits_remaining < 5) {
      showError('Insufficient AI credits. Invoice generation requires 5 credits.');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiClient.post('/invoices/generate_with_ai/', {
        ...formData,
        amount: parseFloat(formData.amount),
        tax_amount: parseFloat(formData.tax_amount),
        due_date: formData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      setInvoices([response.data, ...invoices]);
      setPreviewContent(response.data.ai_generated_content || '');
      setShowPreview(true);
      setShowCreateModal(false);
      setFormData({
        client_name: '',
        client_email: '',
        client_address: '',
        description: '',
        amount: '',
        tax_amount: '0',
        due_date: '',
        invoice_type: 'invoice'
      });
      
      // Update subscription credits
      if (subscription) {
        setSubscription({
          ...subscription,
          ai_credits_remaining: subscription.ai_credits_remaining - 5
        });
      }

      showSuccess('Invoice generated successfully with AI!');
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const markAsPaid = async (invoiceId: number) => {
    try {
      const response = await apiClient.post(`/invoices/${invoiceId}/mark_paid/`);
      setInvoices(invoices.map(inv => 
        inv.id === invoiceId ? response.data : inv
      ));
      showSuccess('Invoice marked as paid');
    } catch (error) {
      showError('Failed to mark invoice as paid');
    }
  };

  const deleteInvoice = async (invoiceId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await apiClient.delete(`/invoices/${invoiceId}/`);
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      showSuccess('Invoice deleted successfully');
    } catch (error) {
      showError('Failed to delete invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Invoice Generator</h1>
          <p className="text-gray-600 mt-2">
            Generate professional invoices using AI-powered content creation
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {subscription && (
            <div className="text-right">
              <div className="text-sm text-gray-500">AI Credits Remaining</div>
              <div className="text-lg font-semibold text-blue-600">
                {subscription.ai_credits_remaining}
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Invoice
          </button>
        </div>
      </div>

      {!subscription?.plan.features.ai_invoice_generation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Sparkles className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">
              AI invoice generation is available in Basic plan and above. 
              <button className="text-yellow-600 underline ml-1">Upgrade now</button>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {invoice.invoice_number}
                </h3>
                <p className="text-sm text-gray-600">{invoice.client_name}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                {invoice.generated_by_ai && (
                  <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    AI Generated
                  </div>
                )}
                
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">${invoice.amount}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due Date:</span>
                <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                <span className="font-medium">Description:</span>
                <p className="mt-1 text-xs">{invoice.description.substring(0, 100)}...</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => {/* TODO: Implement preview */}}
                  className="flex items-center px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </button>
                
                {invoice.pdf_file && (
                  <button
                    onClick={() => window.open(invoice.pdf_file)}
                    className="flex items-center px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2">
                {invoice.status !== 'paid' && (
                  <button
                    onClick={() => markAsPaid(invoice.id)}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Mark Paid
                  </button>
                )}
                
                <button
                  onClick={() => deleteInvoice(invoice.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
          <p className="text-gray-600 mb-4">Generate your first AI-powered invoice to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </button>
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Generate Invoice with AI">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 text-sm">
                AI will generate professional invoice content based on your input (Cost: 5 credits)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({...formData, client_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Email
            </label>
            <input
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({...formData, client_email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service/Product Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the services or products being invoiced..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({...formData, tax_amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type
            </label>
            <select
              value={formData.invoice_type}
              onChange={(e) => setFormData({...formData, invoice_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="invoice">Invoice</option>
              <option value="bill">Bill</option>
              <option value="receipt">Receipt</option>
              <option value="estimate">Estimate</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateInvoiceWithAI}
              disabled={generating || !formData.client_name || !formData.description || !formData.amount}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="AI Generated Invoice Preview">
        <div className="max-h-96 overflow-y-auto">
          <div 
            dangerouslySetInnerHTML={{ __html: previewContent }}
            className="prose prose-sm max-w-none"
          />
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => setShowPreview(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </Modal>
    </div>
  );
};