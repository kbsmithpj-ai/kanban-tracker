/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { nanoid } from 'nanoid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = DEFAULT_DURATION
  ): string => {
    const id = nanoid();
    const toast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after duration (unless duration is 0 for persistent toasts)
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const showError = useCallback((message: string, duration: number = ERROR_DURATION): string => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showSuccess = useCallback((message: string, duration: number = DEFAULT_DURATION): string => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(() => ({
    toasts,
    showToast,
    showError,
    showSuccess,
    dismissToast,
    clearAllToasts,
  }), [toasts, showToast, showError, showSuccess, dismissToast, clearAllToasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
