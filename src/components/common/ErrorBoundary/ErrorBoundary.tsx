import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { logCritical } from '../../../utils/errorLogger';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to render instead of the default error message */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in its child component tree,
 * logs the error, and displays a fallback UI instead of crashing the app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
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
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error logging service
    logCritical('React Error Boundary caught an error', {
      error,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // If a custom fallback is provided, render it
      if (fallback) {
        return fallback;
      }

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
              An unexpected error occurred. Please try again.
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
            <button
              type="button"
              className={styles.button}
              onClick={this.handleReset}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
