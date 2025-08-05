import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  options: Option[];
  value?: string | number;
  multiple?: boolean;
  values?: (string | number)[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
  searchable?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'bordered';
  onChange: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  multiple = false,
  values = [],
  placeholder = 'Select an option...',
  disabled = false,
  error,
  label,
  className = '',
  searchable = false,
  clearable = false,
  size = 'md',
  variant = 'default',
  onChange,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredOptions = searchable && searchTerm
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedValues = multiple ? values : value !== undefined ? [value] : [];
  const selectedOptions = options.filter(option => selectedValues.includes(option.value));

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  const variantClasses = {
    default: 'border border-gray-300 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
    minimal: 'border-b-2 border-gray-300 bg-transparent hover:border-blue-400 focus:border-blue-500',
    bordered: 'border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-white',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[focusedIndex]);
        }
        break;
    }
  };

  const handleOptionClick = (option: Option) => {
    if (option.disabled) return;

    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      onChange(newValues);
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange([]);
    } else {
      onChange('');
    }
    if (onClear) onClear();
  };

  const renderSelectedValue = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-gray-500">{placeholder}</span>;
    }

    if (multiple) {
      if (selectedOptions.length === 1) {
        return (
          <span className="text-gray-900">
            {selectedOptions[0].icon && <span className="mr-2">{selectedOptions[0].icon}</span>}
            {selectedOptions[0].label}
          </span>
        );
      }
      return (
        <span className="text-gray-900">
          {selectedOptions.length} items selected
        </span>
      );
    }

    const option = selectedOptions[0];
    return (
      <span className="text-gray-900">
        {option.icon && <span className="mr-2">{option.icon}</span>}
        {option.label}
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        className={`
          relative w-full rounded-lg cursor-pointer transition-all duration-200
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
          ${isOpen ? 'ring-2 ring-blue-200 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {renderSelectedValue()}
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {clearable && selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            <ChevronDown 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="py-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-base text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={`${option.value}-${index}`}
                    className={`
                      px-4 py-2 cursor-pointer transition-colors duration-150
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isFocused ? 'bg-blue-50' : ''}
                      ${isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-900 hover:bg-gray-50'}
                    `}
                    onClick={() => handleOptionClick(option)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        {option.icon && (
                          <span className="mr-3 text-xl">{option.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-medium truncate">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-sm text-gray-500 truncate">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && multiple && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};