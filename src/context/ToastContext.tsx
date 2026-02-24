/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { nanoid } from 'nanoid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  exiting?: boolean;
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
const EXIT_ANIMATION_MS = 200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Guard against double-dismiss (e.g., user click + auto-dismiss race)
    setToasts(prev => {
      const target = prev.find(t => t.id === id);
      if (!target || target.exiting) return prev;
      return prev.map(t => t.id === id ? { ...t, exiting: true } : t);
    });

    // Clear any existing timer (auto-dismiss) before scheduling removal
    const existingTimer = timerMapRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule actual removal after the CSS exit animation completes
    const exitTimer = setTimeout(() => {
      timerMapRef.current.delete(id);
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, EXIT_ANIMATION_MS);
    timerMapRef.current.set(id, exitTimer);
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
      const timer = setTimeout(() => {
        timerMapRef.current.delete(id);
        dismissToast(id);
      }, duration);
      timerMapRef.current.set(id, timer);
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
    timerMapRef.current.forEach(timer => clearTimeout(timer));
    timerMapRef.current.clear();
    setToasts([]);
  }, []);

  // Clean up all pending timers on unmount
  useEffect(() => {
    const timers = timerMapRef.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
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
