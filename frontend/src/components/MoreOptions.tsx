import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';

interface MoreOptionsProps {
  children: React.ReactNode;
  title?: string;
  defaultOpen?: boolean;
  className?: string;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({
  children,
  title = 'More Options',
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`theme-border-light border-t pt-4 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left theme-text-secondary hover:theme-text-primary transition-colors duration-200 mb-4"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};