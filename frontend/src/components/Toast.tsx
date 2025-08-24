import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType } from '../types';

interface ToastComponentProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastComponentProps> = ({ toast, onRemove }) => {
  const { id, type, message, duration = 5000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onRemove]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "flex items-center gap-3 p-4 rounded-md border-l-4 shadow-heavy min-w-80 transform transition-all duration-300 ease-out translate-x-full opacity-0";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200`;
    }
  };

  const getIconStyles = () => {
    const baseStyles = "flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200`;
      case 'error':
        return `${baseStyles} bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200`;
    }
  };

  return (
    <div className={`${getStyles()} toast-show`}>
      <div className={getIconStyles()}>
        {getIcon()}
      </div>
      
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </div>
      
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

export default Toast;