import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  wrapperClassName?: string;
  as?: 'input' | 'textarea';
}

export const Input: React.FC<InputProps> = ({
  label,
  className = '',
  wrapperClassName = '',
  as = 'input',
  ...props
}) => {
  const baseStyles = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const Component = as;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Component
        className={`${baseStyles} ${className}`.trim()}
        {...props}
      />
    </div>
  );
};