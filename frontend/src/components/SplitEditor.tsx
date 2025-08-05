import { useState } from 'react';
import type { TransactionSplit } from '../types';
import { mockCategories } from '../utils/mockData';
import { Plus, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface SplitEditorProps {
  splits: TransactionSplit[];
  totalAmount: number;
  onSplitsChange: (splits: TransactionSplit[]) => void;
}

export const SplitEditor = ({ splits, totalAmount, onSplitsChange }: SplitEditorProps) => {
  const [localSplits, setLocalSplits] = useState<TransactionSplit[]>(
    splits.length > 0 ? splits : [{
      id: '1',
      categoryId: '',
      amount: totalAmount,
      percentage: 100,
      description: ''
    }]
  );

  const addSplit = () => {
    const newSplit: TransactionSplit = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId: '',
      amount: 0,
      percentage: 0,
      description: ''
    };
    
    const newSplits = [...localSplits, newSplit];
    setLocalSplits(newSplits);
    onSplitsChange(newSplits);
  };

  const removeSplit = (splitId: string) => {
    const newSplits = localSplits.filter(s => s.id !== splitId);
    if (newSplits.length === 0) {
      const defaultSplit: TransactionSplit = {
        id: '1',
        categoryId: '',
        amount: totalAmount,
        percentage: 100,
        description: ''
      };
      setLocalSplits([defaultSplit]);
      onSplitsChange([defaultSplit]);
    } else {
      redistributeAmounts(newSplits);
    }
  };

  const redistributeAmounts = (splits: TransactionSplit[]) => {
    const activeSplits = splits.filter(s => s.categoryId);
    if (activeSplits.length === 0) return;

    const equalPercentage = 100 / activeSplits.length;
    const updatedSplits = splits.map(split => {
      if (split.categoryId) {
        const newPercentage = equalPercentage;
        const newAmount = (Math.abs(totalAmount) * newPercentage / 100) * (totalAmount < 0 ? -1 : 1);
        return { ...split, percentage: newPercentage, amount: newAmount };
      }
      return split;
    });

    setLocalSplits(updatedSplits);
    onSplitsChange(updatedSplits);
  };

  const updateSplit = (splitId: string, field: keyof TransactionSplit, value: string | number) => {
    const updatedSplits = localSplits.map(split => {
      if (split.id === splitId) {
        const updated = { ...split, [field]: value };
        
        if (field === 'percentage') {
          const percentage = Number(value);
          updated.amount = (Math.abs(totalAmount) * percentage / 100) * (totalAmount < 0 ? -1 : 1);
        } else if (field === 'amount') {
          const amount = Number(value);
          updated.percentage = Math.abs(amount) / Math.abs(totalAmount) * 100;
        }
        
        return updated;
      }
      return split;
    });

    setLocalSplits(updatedSplits);
    onSplitsChange(updatedSplits);
  };

  const totalPercentage = localSplits.reduce((sum, split) => sum + split.percentage, 0);
  const totalSplitAmount = localSplits.reduce((sum, split) => sum + split.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Category Splits</h4>
        <Button
          onClick={addSplit}
          size="sm"
          variant="ghost"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Split
        </Button>
      </div>

      <div className="space-y-3">
        {localSplits.map((split) => (
          <div key={split.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded">
            <div className="flex-1">
              <Select
                value={split.categoryId}
                onChange={(e) => updateSplit(split.id, 'categoryId', e.target.value)}
                options={[{ value: "", label: "Select category" }, ...mockCategories.map(category => ({ value: category.id, label: category.name })) ]}
                className="w-full px-2 py-1 text-sm"
              />
            </div>
            
            <div className="w-24">
              <Input
                type="number"
                placeholder="Amount"
                value={split.amount.toFixed(2)}
                onChange={(e) => updateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                step="0.01"
                className="w-full px-2 py-1 text-sm"
              />
            </div>
            
            <div className="w-20">
              <Input
                type="number"
                placeholder="%"
                value={split.percentage.toFixed(1)}
                onChange={(e) => updateSplit(split.id, 'percentage', parseFloat(e.target.value) || 0)}
                step="0.1"
                max="100"
                min="0"
                className="w-full px-2 py-1 text-sm"
              />
            </div>
            
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Description (optional)"
                value={split.description || ''}
                onChange={(e) => updateSplit(split.id, 'description', e.target.value)}
                className="w-full px-2 py-1 text-sm"
              />
            </div>
            
            {localSplits.length > 1 && (
              <Button
                onClick={() => removeSplit(split.id)}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-sm">
        <div className={`font-medium ${Math.abs(totalPercentage - 100) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
          Total: {totalPercentage.toFixed(1)}%
        </div>
        <div className={`font-medium ${Math.abs(totalSplitAmount - totalAmount) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
          Amount: ${totalSplitAmount.toFixed(2)} / ${totalAmount.toFixed(2)}
        </div>
      </div>

      {Math.abs(totalPercentage - 100) > 0.1 && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Warning: Total percentage should equal 100%
        </div>
      )}
    </div>
  );
};