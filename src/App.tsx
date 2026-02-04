import React, { useState, useEffect, useCallback } from 'react';
import { TaskProvider, FilterProvider, UIProvider, TeamProvider, AuthProvider, useAuth } from './context';
import { Header, Sidebar, MainContent } from './components/layout';
import { TaskModal } from './components/task';
import { InviteModal } from './components/team';
import { LoginPage } from './components/auth';
import { clearAllStateAndReload } from './utils/recovery';
import './index.css';

/** Timeout before showing the "stuck loading" error UI (10 seconds) */
const LOADING_TIMEOUT_MS = 10000;

interface LoadingScreenProps {
  /** If true, shows a timeout error with recovery options */
  showTimeoutError?: boolean;
  /** Optional error message to display */
  errorMessage?: string | null;
  /** Callback for retry button */
  onRetry?: () => void;
}

function LoadingScreen({ showTimeoutError, errorMessage, onRetry }: LoadingScreenProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAndRetry = useCallback(async () => {
    setIsClearing(true);
    await clearAllStateAndReload();
    // Note: page will reload, so no need to reset state
  }, []);

  const displayError = errorMessage || (showTimeoutError
    ? 'The app is taking too long to load. This may be due to a network issue or corrupted data.'
    : null);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-white)',
    }}>
      <div style={{
        padding: 'var(--space-lg)',
        background: 'var(--color-white)',
        border: 'var(--nb-border)',
        borderRadius: 'var(--nb-radius)',
        boxShadow: 'var(--nb-shadow)',
        fontFamily: 'var(--font-primary)',
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        {displayError ? (
          <>
            <div style={{
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 'var(--space-md)',
              color: 'var(--color-status-urgent)',
            }}>
              Loading Error
            </div>
            <p style={{
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.5,
              textTransform: 'none',
              fontWeight: 400,
            }}>
              {displayError}
            </p>
            <div style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--brand-cyan)',
                    color: 'var(--color-white)',
                    border: 'var(--nb-border)',
                    borderRadius: 'var(--nb-radius)',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleClearAndRetry}
                disabled={isClearing}
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: isClearing ? 'var(--color-gray-300)' : 'var(--color-white)',
                  color: isClearing ? 'var(--color-gray-500)' : 'var(--brand-navy)',
                  border: 'var(--nb-border)',
                  borderRadius: 'var(--nb-radius)',
                  fontFamily: 'var(--font-primary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                }}
              >
                {isClearing ? 'Clearing...' : 'Clear Data & Retry'}
              </button>
            </div>
            <p style={{
              marginTop: 'var(--space-md)',
              fontSize: '0.85em',
              color: 'var(--color-gray-500)',
              textTransform: 'none',
              fontWeight: 400,
            }}>
              "Clear Data & Retry" will sign you out and clear cached data.
            </p>
          </>
        ) : (
          <div style={{
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <Header />
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <Sidebar />
        <MainContent />
      </div>
      <TaskModal />
      <InviteModal />
    </div>
  );
}

/**
 * Custom hook to track if loading has exceeded the timeout threshold.
 * Uses a timer approach that avoids synchronous setState in effects.
 */
function useLoadingTimeout(isLoading: boolean, timeoutMs: number): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const loadingStartRef = React.useRef<number | null>(null);

  // Track when loading starts and clear on stop
  if (isLoading && loadingStartRef.current === null) {
    loadingStartRef.current = Date.now();
  } else if (!isLoading && loadingStartRef.current !== null) {
    loadingStartRef.current = null;
  }

  // Set up the timeout timer
  useEffect(() => {
    if (!isLoading) {
      // Reset timed out state when loading completes
      // This is safe because it happens when we transition to not loading
      if (timedOut) {
        setTimedOut(false);
      }
      return;
    }

    // Start timeout timer
    const timeoutId = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, timeoutMs]);

  return timedOut;
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, isRecoveryMode, authError, retryAuth } = useAuth();
  const loadingTimedOut = useLoadingTimeout(isLoading, LOADING_TIMEOUT_MS);

  // Show loading screen with timeout/error handling
  if (isLoading) {
    return (
      <LoadingScreen
        showTimeoutError={loadingTimedOut}
        errorMessage={authError}
        onRetry={retryAuth}
      />
    );
  }

  // Show error if auth failed
  if (authError) {
    return (
      <LoadingScreen
        errorMessage={authError}
        onRetry={retryAuth}
      />
    );
  }

  // Show LoginPage for password reset even if authenticated (recovery token creates a session)
  if (!isAuthenticated || isRecoveryMode) {
    return <LoginPage />;
  }

  return (
    <TeamProvider>
      <TaskProvider>
        <FilterProvider>
          <AppLayout />
        </FilterProvider>
      </TaskProvider>
    </TeamProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AuthenticatedApp />
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
