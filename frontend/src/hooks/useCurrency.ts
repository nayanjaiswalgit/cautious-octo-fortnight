import { useAuth } from '../contexts/AuthContext';

export const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }
];

export const useCurrency = () => {
  const { state: authState } = useAuth();
  
  const getDefaultCurrency = () => {
    return authState.user?.preferred_currency || 'USD';
  };
  
  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };
  
  const getCurrencyName = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.name || currencyCode;
  };
  
  return {
    currencies,
    getDefaultCurrency,
    getCurrencySymbol,
    getCurrencyName
  };
};