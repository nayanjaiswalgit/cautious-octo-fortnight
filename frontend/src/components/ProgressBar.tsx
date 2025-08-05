import React from 'react';

interface ProgressBarProps {
  percentage: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className }) => {
  const width = Math.min(percentage, 100);
  return (
    <div
      className={`h-2 rounded-full ${className}`}
      style={{ width: `${width}%` }}
    ></div>
  );
};
