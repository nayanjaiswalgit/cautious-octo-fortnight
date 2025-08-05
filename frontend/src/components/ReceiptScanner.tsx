import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Eye, EyeOff, Loader, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../api/client';
import type { Account, Category } from '../types';

interface ReceiptScannerProps {
  accounts: Account[];
  categories: Category[];
  onTransactionCreated?: (transactionId: number) => void;
  onClose?: () => void;
}

interface OCRResult {
  merchant_name?: string;
  amount?: string;
  date?: string;
  items: string[];
  suggested_category?: string;
  confidence: number;
  ai_analysis?: string;
  raw_text: string;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  accounts,
  categories,
  onTransactionCreated,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Editable transaction details
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, BMP, TIFF)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setOCRResult(null);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const processReceipt = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const result = await apiClient.processReceipt(selectedFile, selectedAccount || undefined);
      
      if (result.success) {
        setOCRResult(result.ocr_result);
        
        // Pre-fill form with OCR results
        setMerchantName(result.ocr_result.merchant_name || '');
        setAmount(result.ocr_result.amount || '');
        setDate(result.ocr_result.date || new Date().toISOString().split('T')[0]);
        setSelectedCategory(result.ocr_result.suggested_category || '');
        
        // Set notes with items if available
        if (result.ocr_result.items.length > 0) {
          setNotes(`Items: ${result.ocr_result.items.join(', ')}`);
        }
        
        toast.success(`Receipt processed! Confidence: ${Math.round(result.ocr_result.confidence * 100)}%`);
      } else {
        toast.error('Failed to process receipt');
      }
    } catch (error: any) {
      console.error('Receipt processing error:', error);
      toast.error(error.response?.data?.error || 'Failed to process receipt');
    } finally {
      setProcessing(false);
    }
  };

  const createTransaction = async () => {
    if (!merchantName || !amount || !date || !selectedAccount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const result = await apiClient.createTransactionFromReceipt({
        merchant_name: merchantName,
        amount: parseFloat(amount),
        date: date,
        account_id: selectedAccount,
        category_name: selectedCategory,
        items: ocrResult?.items,
        notes: notes,
      });

      if (result.success) {
        toast.success('Transaction created successfully!');
        onTransactionCreated?.(result.transaction_id);
        resetForm();
      }
    } catch (error: any) {
      console.error('Transaction creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setOCRResult(null);
    setMerchantName('');
    setAmount('');
    setDate('');
    setSelectedCategory('');
    setNotes('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Camera className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Scanner</h1>
            <p className="text-gray-600">Scan receipts with AI-powered OCR and auto-categorization</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - File Upload & Preview */}
        <div className="space-y-6">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Account *
            </label>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Choose an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.account_type})
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Receipt Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Click to upload receipt image
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, GIF, BMP, TIFF (max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Preview
              </label>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-64 object-contain bg-gray-50"
                />
              </div>
              
              {/* Process Button */}
              <button
                onClick={processReceipt}
                disabled={processing || !selectedAccount}
                className="w-full mt-4 flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Process Receipt with AI</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - OCR Results & Transaction Form */}
        <div className="space-y-6">
          {/* OCR Results */}
          {ocrResult && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">OCR Results</h3>
                <div className={`flex items-center space-x-2 ${getConfidenceColor(ocrResult.confidence)}`}>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {Math.round(ocrResult.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* AI Analysis */}
              {ocrResult.ai_analysis && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>AI Analysis:</strong> {ocrResult.ai_analysis}
                  </p>
                </div>
              )}

              {/* Items Found */}
              {ocrResult.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items Found:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {ocrResult.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Text Toggle */}
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showRawText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showRawText ? 'Hide' : 'Show'} raw OCR text</span>
              </button>

              {showRawText && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono max-h-32 overflow-y-auto">
                  {ocrResult.raw_text}
                </div>
              )}
            </div>
          )}

          {/* Transaction Form */}
          {ocrResult && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Transaction</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merchant Name *
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter merchant name"
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
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a category...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={createTransaction}
                    disabled={creating || !merchantName || !amount || !date || !selectedAccount}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Create Transaction</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;