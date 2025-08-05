import React from 'react';
import { useCurrency } from '../hooks/useCurrency';

interface CurrencyFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  label = 'Currency',
  disabled = false
}) => {
  const { currencies } = useCurrency();

  return (
    <div className={className}>
      <label className="theme-form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="theme-select"
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
};