/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DbTeamMember } from '../types/database';

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
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  clearRecoveryMode: () => void;
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

  /**
   * Fetches the team member record associated with the authenticated user.
   */
  const fetchTeamMember = useCallback(async (userId: string): Promise<DbTeamMember | null> => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch team member:', error);
      return null;
    }

    return data as DbTeamMember;
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
   */
  useEffect(() => {
    let mounted = true;

    // Check for recovery token in URL hash first
    checkForRecoveryToken();

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const member = await fetchTeamMember(currentSession.user.id);
          if (mounted) {
            setTeamMember(member);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        if (mounted) {
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
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const member = await fetchTeamMember(currentSession.user.id);
          setTeamMember(member);
        } else {
          setTeamMember(null);
        }

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setTeamMember(null);
          setIsRecoveryMode(false);
        }

        // Handle password recovery event from Supabase
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
          // Clear the URL hash after Supabase has processed the tokens
          clearUrlHash();
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
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
  }), [
    user,
    session,
    teamMember,
    isAdmin,
    isLoading,
    isAuthenticated,
    isRecoveryMode,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
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
