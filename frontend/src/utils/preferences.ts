import type { User } from '../types';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
};

export const formatCurrency = (amount: number, user?: User | null): string => {
  const currency = user?.preferred_currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  
  // Format number with appropriate decimal places
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${symbol}${formatted}`;
};

export const formatDate = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferred_date_format || 'MM/DD/YYYY';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const formatDateShort = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferred_date_format || 'MM/DD/YYYY';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const getDateInputFormat = (dateString: string): string => {
  // Always return YYYY-MM-DD format for HTML date inputs
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDateFormat = (user?: User | null): string => {
  return user?.preferred_date_format || 'MM/DD/YYYY';
};

export const getDefaultCurrency = (user?: User | null): string => {
  return user?.preferred_currency || 'USD';
};