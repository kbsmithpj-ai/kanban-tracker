import { useToast } from '../../../context/ToastContext';
import { Toast } from './Toast';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.toastContainer} aria-label="Notifications">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
