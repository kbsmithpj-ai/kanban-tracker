/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DbTeamMember } from '../types/database';
import { withTimeout, clearAuthState } from '../utils/recovery';
import { logError } from '../utils/errorLogger';

/** Timeout for session initialization (5 seconds) */
const SESSION_TIMEOUT_MS = 5000;

/** Timeout for fetching team member data (5 seconds) */
const TEAM_MEMBER_TIMEOUT_MS = 5000;

/**
 * Avatar color palette - Confluence Genetics brand colors.
 */
const AVATAR_COLORS = [
  '#00a8e8', // brand cyan
  '#4cb944', // brand green
  '#f5b800', // brand gold
  '#7c5cbf', // purple
  '#e07040', // orange
  '#0088bc', // cyan dark
  '#3a9435', // green dark
  '#c49400', // gold dark
];

/**
 * Generates initials from a full name.
 * - For "John Smith" returns "JS"
 * - For "John" returns "JO"
 * - For empty string returns "??"
 */
function generateInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '??';

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

/**
 * Generates a random avatar color from the predefined palette.
 */
function generateAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

interface AuthResult {
  error?: AuthError;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  teamMember: DbTeamMember | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRecoveryMode: boolean;
  /** Error message when auth initialization fails */
  authError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  clearRecoveryMode: () => void;
  /** Retry authentication after an error */
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [teamMember, setTeamMember] = useState<DbTeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /** Track initialization attempts to allow retry */
  const initAttemptRef = useRef(0);

  /**
   * Fetches the team member record associated with the authenticated user.
   * Returns null if the user doesn't have a team member record (expected for new invites).
   * Throws on network/timeout errors to allow proper error handling upstream.
   */
  const fetchTeamMember = useCallback(async (userId: string): Promise<DbTeamMember | null> => {
    try {
      // Create a proper Promise wrapper for the Supabase query
      const fetchPromise = Promise.resolve(
        supabase
          .from('team_members')
          .select('*')
          .eq('user_id', userId)
          .single()
      );

      const result = await withTimeout(
        fetchPromise,
        TEAM_MEMBER_TIMEOUT_MS,
        'Team member fetch timed out'
      );

      const { data, error } = result;

      if (error) {
        // PGRST116 means no rows found - this is expected for users not yet in team_members
        // (e.g., during invitation flow before they complete signup)
        if (error.code === 'PGRST116') {
          console.warn('No team member record found for user:', userId);
          return null;
        }
        console.error('Failed to fetch team member:', error);
        return null;
      }

      return data as DbTeamMember;
    } catch (error) {
      // Timeout or network error
      console.error('Team member fetch failed:', error);
      logError('Team member fetch failed', {
        error,
        context: { operation: 'fetchTeamMember', userId },
      });
      throw error; // Re-throw to allow upstream handling
    }
  }, []);

  /**
   * Links a pending team member record (created during invite) to the authenticated user.
   * This is called when a user signs in but has no team_member record linked to their user_id.
   * It looks for a pending record with matching email and updates it with the user_id.
   */
  const linkPendingTeamMember = useCallback(async (userId: string, email: string): Promise<DbTeamMember | null> => {
    try {
      // Look for a pending team_member record with this email but no user_id
      const { data: pendingMember, error: findError } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', email)
        .is('user_id', null)
        .single();

      if (findError || !pendingMember) {
        // No pending record found - this is OK, user might need to sign up normally
        return null;
      }

      // Cast to DbTeamMember for type safety
      const pending = pendingMember as DbTeamMember;

      // Found a pending record - link it to this user
      const { data: updatedMember, error: updateError } = await supabase
        .from('team_members')
        .update({ user_id: userId })
        .eq('id', pending.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Failed to link pending team member:', updateError);
        return null;
      }

      console.log('Successfully linked pending team member record to user:', userId);
      return updatedMember as DbTeamMember;
    } catch (error) {
      console.error('Error linking pending team member:', error);
      logError('Error linking pending team member', {
        error,
        context: { operation: 'linkPendingTeamMember', userId },
      });
      return null;
    }
  }, []);

  /**
   * Parse URL hash to detect password recovery tokens.
   * Supabase sends recovery tokens in URL hash: #access_token=...&type=recovery
   */
  const checkForRecoveryToken = useCallback(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
      // Clear the hash from URL for cleaner appearance (but keep tokens for Supabase to process)
      // We delay clearing to allow Supabase to read the tokens first
    }
  }, []);

  /**
   * Clear the URL hash after recovery tokens have been processed.
   */
  const clearUrlHash = useCallback(() => {
    if (window.location.hash) {
      // Use replaceState to clear hash without triggering navigation
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  /**
   * Initialize auth state on mount by checking for existing session.
   * Includes timeout protection and error recovery.
   */
  useEffect(() => {
    let mounted = true;
    const currentAttempt = ++initAttemptRef.current;

    // Check for recovery token in URL hash first
    checkForRecoveryToken();

    async function initializeAuth() {
      // Clear any previous error
      setAuthError(null);

      try {
        // Wrap getSession with timeout to prevent indefinite loading
        const sessionPromise = supabase.auth.getSession();
        const { data: { session: currentSession } } = await withTimeout(
          sessionPromise,
          SESSION_TIMEOUT_MS,
          'Session fetch timed out'
        );

        if (!mounted || currentAttempt !== initAttemptRef.current) return;

        if (currentSession?.user) {
          // Validate that the session isn't expired
          const now = Math.floor(Date.now() / 1000);
          if (currentSession.expires_at && currentSession.expires_at < now) {
            console.warn('Session has expired, clearing auth state');
            await clearAuthState();
            if (mounted) {
              setSession(null);
              setUser(null);
              setTeamMember(null);
            }
            return;
          }

          setSession(currentSession);
          setUser(currentSession.user);

          try {
            let member = await fetchTeamMember(currentSession.user.id);

            // If no linked team member found, try to link a pending invite record
            if (!member && currentSession.user.email) {
              member = await linkPendingTeamMember(
                currentSession.user.id,
                currentSession.user.email
              );
            }

            if (mounted && currentAttempt === initAttemptRef.current) {
              setTeamMember(member);
            }
          } catch (teamMemberError) {
            // Team member fetch failed (timeout or network error)
            // User is still authenticated, but we couldn't get their profile
            console.warn('Could not fetch team member, continuing with auth only:', teamMemberError);
            if (mounted && currentAttempt === initAttemptRef.current) {
              setTeamMember(null);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);

        if (!mounted || currentAttempt !== initAttemptRef.current) return;

        // Check if this is a timeout error
        const isTimeout = error instanceof Error && error.message.includes('timed out');

        if (isTimeout) {
          // Session fetch timed out - likely corrupted state or network issue
          // Clear auth state and show error
          console.warn('Session initialization timed out, clearing auth state');
          logError('Auth initialization timed out', {
            error,
            context: { operation: 'initializeAuth', isTimeout: true },
          });
          try {
            await clearAuthState();
          } catch {
            // Ignore cleanup errors
          }
          setAuthError('Connection timed out. Please check your internet connection and try again.');
        } else {
          // Other error - clear state and show generic error
          logError('Auth initialization failed', {
            error,
            context: { operation: 'initializeAuth', isTimeout: false },
          });
          try {
            await clearAuthState();
          } catch {
            // Ignore cleanup errors
          }
          setAuthError('Failed to load your session. Please try again.');
        }

        // Reset auth state
        setSession(null);
        setUser(null);
        setTeamMember(null);
      } finally {
        if (mounted && currentAttempt === initAttemptRef.current) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [fetchTeamMember, checkForRecoveryToken]);

  /**
   * Subscribe to auth state changes.
   * Handles sign in/out, token refresh, and password recovery events.
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Clear any auth error on successful auth events
        if (currentSession) {
          setAuthError(null);
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          try {
            let member = await fetchTeamMember(currentSession.user.id);

            // If no linked team member found, try to link a pending invite record
            if (!member && currentSession.user.email) {
              member = await linkPendingTeamMember(
                currentSession.user.id,
                currentSession.user.email
              );
            }

            setTeamMember(member);
          } catch (error) {
            // Team member fetch failed, but user is still authenticated
            console.warn('Failed to fetch team member on auth change:', error);
            logError('Failed to fetch team member on auth state change', {
              error,
              context: { operation: 'onAuthStateChange', userId: currentSession.user.id },
            });
            setTeamMember(null);
          }
        } else {
          setTeamMember(null);
        }

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_OUT':
            setTeamMember(null);
            setIsRecoveryMode(false);
            setAuthError(null);
            break;

          case 'PASSWORD_RECOVERY':
            // Handle password recovery event from Supabase
            setIsRecoveryMode(true);
            // Clear the URL hash after Supabase has processed the tokens
            clearUrlHash();
            break;

          case 'TOKEN_REFRESHED':
            // Token was refreshed successfully - update session state
            // This ensures the app has the latest valid tokens
            if (currentSession) {
              setSession(currentSession);
            }
            break;

          case 'SIGNED_IN':
          case 'INITIAL_SESSION':
            // Clear loading state on successful auth
            setIsLoading(false);
            break;

          default:
            // Handle any other events
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchTeamMember, clearUrlHash]);

  /**
   * Sign in with email and password.
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    return {};
  }, []);

  /**
   * Sign up with email, password, and name.
   * Creates both the auth user and the team_member record.
   */
  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string
  ): Promise<AuthResult> => {
    // Create the auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { error: authError };
    }

    if (!data.user) {
      return {
        error: {
          message: 'Failed to create user account',
          status: 500,
          name: 'AuthError',
        } as AuthError,
      };
    }

    // Create the team_member record
    const { error: teamError } = await supabase
      .from('team_members')
      .insert({
        user_id: data.user.id,
        name: name.trim(),
        email,
        initials: generateInitials(name),
        avatar_color: generateAvatarColor(),
        is_admin: false,
      });

    if (teamError) {
      console.error('Failed to create team member record:', teamError);
      logError('Failed to create team member record during signup', {
        error: teamError,
        context: { operation: 'signUp', userId: data.user.id },
      });
      // The auth user was created, but team member creation failed.
      // In a production system, you might want to handle this more gracefully.
      return {
        error: {
          message: 'Account created but profile setup failed. Please contact support.',
          status: 500,
          name: 'AuthError',
        } as AuthError,
      };
    }

    return {};
  }, []);

  /**
   * Sign out the current user.
   */
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setTeamMember(null);
  }, []);

  /**
   * Send a password reset email.
   */
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error };
    }

    return {};
  }, []);

  /**
   * Update the user's password (used during password recovery flow).
   */
  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error };
    }

    // Clear recovery mode after successful password update
    setIsRecoveryMode(false);
    clearUrlHash();

    return {};
  }, [clearUrlHash]);

  /**
   * Clear recovery mode (used when user cancels or navigates away).
   */
  const clearRecoveryMode = useCallback(() => {
    setIsRecoveryMode(false);
    clearUrlHash();
  }, [clearUrlHash]);

  /**
   * Retry authentication after an error.
   * Triggers re-initialization by incrementing the attempt counter.
   */
  const retryAuth = useCallback(() => {
    setIsLoading(true);
    setAuthError(null);
    // Increment the attempt ref to trigger the useEffect
    initAttemptRef.current++;
    // Force a re-run of the init effect by updating state
    setUser(null);
    setSession(null);
    setTeamMember(null);
  }, []);

  // Re-run initialization when retryAuth is called
  useEffect(() => {
    // This effect re-triggers initialization when auth state is reset via retryAuth
    // The initAttemptRef ensures we don't double-run
    if (!isLoading && authError === null && user === null && session === null) {
      // Check if we were explicitly reset (not initial load)
      const currentAttempt = initAttemptRef.current;
      if (currentAttempt > 1) {
        setIsLoading(true);
        // The main initialization effect will pick this up
      }
    }
  }, [isLoading, authError, user, session]);

  const isAdmin = teamMember?.is_admin ?? false;
  const isAuthenticated = user !== null;

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    teamMember,
    isAdmin,
    isLoading,
    isAuthenticated,
    isRecoveryMode,
    authError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
    retryAuth,
  }), [
    user,
    session,
    teamMember,
    isAdmin,
    isLoading,
    isAuthenticated,
    isRecoveryMode,
    authError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
    retryAuth,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
