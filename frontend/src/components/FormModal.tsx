import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface _FormModalProps<_T = unknown> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  showFullscreenToggle?: boolean;
  onSubmit?: (data: _T) => Promise<void>;
  fields?: unknown[];
  initialData?: _T;
}

export const FormModal = <_T,>({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showFullscreenToggle = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div 
      className="theme-modal-overlay flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`theme-bg-modal rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-out scale-100 theme-border border ${
          isFullscreen 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : `w-full ${sizeClasses[size]} max-h-[90vh]`
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 theme-border-light border-b theme-bg-secondary">
          <h2 className="text-xl font-bold theme-text-primary flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
            {title}
          </h2>
          <div className="flex items-center space-x-2">
            {showFullscreenToggle && (
              <button
                onClick={toggleFullscreen}
                className="theme-btn-icon"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="theme-btn-icon group"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 group-hover:text-red-600" />
            </button>
          </div>
        </div>
        
        <div className={`overflow-y-auto ${
          isFullscreen ? 'h-[calc(100vh-80px)] p-8' : 'max-h-[calc(90vh-120px)] p-6'
        }`}>
          {children}
        </div>
      </div>
    </div>)}