import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`card p-6 hover:shadow-soft-lg transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  );
};