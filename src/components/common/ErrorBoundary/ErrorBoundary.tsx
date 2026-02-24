import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { logCritical } from '../../../utils/errorLogger';
import styles from './ErrorBoundary.module.css';

const MAX_RETRIES = 3;

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI, or a render function receiving the error and a reset callback */
  fallback?: ReactNode | ((error: Error | null, reset: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in its child component tree,
 * logs the error, and displays a fallback UI instead of crashing the app.
 *
 * Retries are capped at MAX_RETRIES to prevent infinite crash loops when the
 * underlying error persists across re-renders.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * <ErrorBoundary fallback={(error, reset) => (
 *   <div>
 *     <p>Error: {error?.message}</p>
 *     <button onClick={reset}>Retry</button>
 *   </div>
 * )}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'hasError' | 'error'> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logCritical('React Error Boundary caught an error', {
      error,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReset = (): void => {
    if (this.state.retryCount >= MAX_RETRIES) return;
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(error, this.handleReset)
          : fallback;
      }

      const retriesExhausted = retryCount >= MAX_RETRIES;

      // Default fallback UI
      return (
        <div
          className={styles.container}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.content}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.message}>
              {retriesExhausted
                ? 'This error could not be recovered automatically. Please refresh the page.'
                : 'An unexpected error occurred. Please try again.'}
            </p>
            {import.meta.env.DEV && error && (
              <details className={styles.details}>
                <summary className={styles.summary}>Error details</summary>
                <pre className={styles.errorText}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            {retriesExhausted ? (
              <button
                type="button"
                className={styles.button}
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            ) : (
              <button
                type="button"
                className={styles.button}
                onClick={this.handleReset}
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
