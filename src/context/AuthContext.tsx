/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DbTeamMember } from '../types/database';

/**
 * Avatar color palette - matches the neo-brutalism design system colors.
 */
const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#84CC16', // lime
  '#EC4899', // pink
  '#8B5CF6', // purple
  '#F97316', // orange
  '#14B8A6', // teal
  '#EF4444', // red
  '#6366F1', // indigo
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
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
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
   * Initialize auth state on mount by checking for existing session.
   */
  useEffect(() => {
    let mounted = true;

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
  }, [fetchTeamMember]);

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

        // Handle specific auth events if needed
        if (event === 'SIGNED_OUT') {
          setTeamMember(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchTeamMember]);

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

  const isAdmin = teamMember?.is_admin ?? false;
  const isAuthenticated = user !== null;

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    teamMember,
    isAdmin,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [
    user,
    session,
    teamMember,
    isAdmin,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
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
