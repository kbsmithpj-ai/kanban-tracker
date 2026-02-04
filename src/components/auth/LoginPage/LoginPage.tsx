import { useState, useCallback, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Input, Button } from '../../common';
import styles from './LoginPage.module.css';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const MIN_PASSWORD_LENGTH = 8;

export function LoginPage() {
  const { signIn, signUp, resetPassword, updatePassword, isRecoveryMode, clearRecoveryMode } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When recovery mode is detected, switch to reset-password mode
  useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset-password');
      setError(null);
      setSuccess(null);
    }
  }, [isRecoveryMode]);

  const clearForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError(null);
    setSuccess(null);
  }, []);

  const handleModeChange = useCallback((newMode: AuthMode) => {
    // If leaving reset-password mode, clear recovery mode
    if (mode === 'reset-password' && newMode !== 'reset-password') {
      clearRecoveryMode();
    }
    clearForm();
    setMode(newMode);
  }, [clearForm, mode, clearRecoveryMode]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message);
        }
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your full name');
          setIsSubmitting(false);
          return;
        }
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
        }
      } else if (mode === 'forgot-password') {
        const result = await resetPassword(email);
        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccess('Password reset email sent. Please check your inbox.');
        }
      } else if (mode === 'reset-password') {
        // Validate password length
        if (password.length < MIN_PASSWORD_LENGTH) {
          setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
          setIsSubmitting(false);
          return;
        }
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsSubmitting(false);
          return;
        }
        const result = await updatePassword(password);
        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccess('Password updated successfully! You can now sign in with your new password.');
          // Clear form and switch to login mode after a brief delay
          setTimeout(() => {
            handleModeChange('login');
          }, 2000);
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, email, password, confirmPassword, name, signIn, signUp, resetPassword, updatePassword, handleModeChange]);

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In';
      case 'signup':
        return 'Create Account';
      case 'forgot-password':
        return 'Reset Password';
      case 'reset-password':
        return 'Set New Password';
    }
  };

  const getSubmitText = () => {
    if (isSubmitting) {
      return 'Please wait...';
    }
    switch (mode) {
      case 'login':
        return 'Sign In';
      case 'signup':
        return 'Create Account';
      case 'forgot-password':
        return 'Send Reset Link';
      case 'reset-password':
        return 'Update Password';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Kanban Tracker</div>
          <h1 className={styles.title}>{getTitle()}</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              required
              autoComplete="name"
            />
          )}

          {mode !== 'reset-password' && (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          )}

          {mode === 'reset-password' && (
            <>
              <p className={styles.resetPasswordHint}>
                Enter your new password below. Password must be at least {MIN_PASSWORD_LENGTH} characters long.
              </p>
              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
            </>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          )}

          {error && (
            <div className={`${styles.message} ${styles.error}`} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={`${styles.message} ${styles.success}`} role="status">
              {success}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {getSubmitText()}
          </Button>
        </form>

        <div className={styles.footer}>
          {mode === 'login' && (
            <>
              <div className={styles.footerText}>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleModeChange('forgot-password')}
                >
                  Forgot your password?
                </button>
              </div>
              <div className={styles.divider}>or</div>
              <div className={styles.footerText}>
                Don't have an account?{' '}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleModeChange('signup')}
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className={styles.footerText}>
              Already have an account?{' '}
              <button
                type="button"
                className={styles.link}
                onClick={() => handleModeChange('login')}
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'forgot-password' && (
            <div className={styles.footerText}>
              Remember your password?{' '}
              <button
                type="button"
                className={styles.link}
                onClick={() => handleModeChange('login')}
              >
                Back to sign in
              </button>
            </div>
          )}

          {mode === 'reset-password' && (
            <div className={styles.footerText}>
              Changed your mind?{' '}
              <button
                type="button"
                className={styles.link}
                onClick={() => handleModeChange('login')}
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
