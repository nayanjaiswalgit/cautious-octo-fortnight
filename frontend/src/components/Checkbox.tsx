import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => {
  return (
    <label className="flex items-center p-4 theme-bg-secondary rounded-lg theme-border border shadow-sm">
      <input
        type="checkbox"
        className="h-5 w-5 text-blue-600 dark:text-blue-400 theme-border rounded focus:ring-2 focus:ring-blue-500/20"
        {...props}
      />
      <span className="ml-4 text-lg font-medium theme-text-primary">{label}</span>
    </label>
  );
};
