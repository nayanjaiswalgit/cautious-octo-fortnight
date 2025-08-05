import React, { useEffect, useState, createContext, useContext, useCallback } from "react";
import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Auto dismiss
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case "success":
        return "theme-notification-success";
      case "error":
        return "theme-notification-error";
      case "warning":
        return "theme-notification-warning";
      case "info":
        return "theme-notification-info";
      default:
        return "theme-notification";
    }
  };

  return (
    <div
      className={`
        relative max-w-sm w-full p-4 transition-all duration-300 ease-out transform
        ${getColorClasses()}
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-4 flex-1">
          <h3 className="text-sm font-semibold theme-text-primary">{title}</h3>
          {message && <p className="mt-1 text-xs theme-text-secondary">{message}</p>}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => onClose(id)}
            className="inline-flex theme-text-muted hover:theme-text-secondary focus:outline-none transition ease-in-out duration-150 p-1 rounded-full theme-bg-hover"
            aria-label="Close notification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Context and Hook
interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  removeToast: (id: string) => void;
  toasts: ToastProps[];
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  ToastContainer: React.FC;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  // Toast Container Component
  const ToastContainer: React.FC = useCallback(() => {
    return (
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    );
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ 
      addToast, 
      removeToast, 
      toasts, 
      showSuccess, 
      showError, 
      showWarning, 
      showInfo,
      ToastContainer 
    }}>
      {children}
      {/* Built-in Toast Container */}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
