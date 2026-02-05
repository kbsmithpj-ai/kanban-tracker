import { useCallback } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from '../../../context/ToastContext';
import styles from './Toast.module.css';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastVariant, string> = {
  error: '!',
  success: '\u2713',
  warning: '!',
  info: 'i',
};

const TOAST_LABELS: Record<ToastVariant, string> = {
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Info',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const handleDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  const icon = TOAST_ICONS[toast.type];
  const label = TOAST_LABELS[toast.type];

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.content}>
        <span className="visually-hidden">{label}: </span>
        <span className={styles.message}>{toast.message}</span>
      </div>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={handleDismiss}
        aria-label={`Dismiss ${label.toLowerCase()} notification`}
      >
        &times;
      </button>
    </div>
  );
}
