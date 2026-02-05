/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DbTeamMember } from '../types/database';
import type { TeamMember } from '../types/team';
import { logError } from '../utils/errorLogger';

/**
 * Predefined avatar colors for new team members.
 * Confluence Genetics brand colors.
 * Colors are assigned based on the hash of the member's email.
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
 * Generates a consistent avatar color based on a string input.
 * Uses a simple hash to ensure the same input always produces the same color.
 */
function generateAvatarColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Generates initials from a name.
 * Takes the first letter of the first word and first letter of the last word.
 * For single names, takes the first two letters.
 */
function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Transforms a database team member record (snake_case) to the application
 * TeamMember type (camelCase).
 */
function transformDbTeamMember(db: DbTeamMember): TeamMember {
  return {
    id: db.id,
    name: db.name,
    initials: db.initials,
    avatarColor: db.avatar_color,
  };
}

export interface InviteResult {
  success: boolean;
  message: string;
}

export interface TeamContextValue {
  /** List of all team members */
  teamMembers: TeamMember[];
  /** True while initial data is being fetched */
  isLoading: boolean;
  /** Error from the most recent fetch operation, if any */
  error: Error | null;
  /** Retrieve a team member by ID. Returns null if not found. */
  getTeamMember: (id: string | null) => TeamMember | null;
  /** Add a new team member. Returns the created member. */
  addTeamMember: (email: string, name: string) => Promise<TeamMember>;
  /** Remove a team member by ID. */
  removeTeamMember: (id: string) => Promise<void>;
  /**
   * Invite a new team member by email.
   * Uses Supabase magic link (OTP) to send an invitation.
   * Note: For true admin invites, a Supabase Edge Function would be needed.
   */
  inviteTeamMember: (email: string, name: string) => Promise<InviteResult>;
  /** Manually refetch the team members list. */
  refetch: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | null>(null);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Fetch all team members from the database.
   */
  const fetchTeamMembers = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const members = ((data ?? []) as DbTeamMember[]).map(transformDbTeamMember);
      setTeamMembers(members);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team members';
      setError(new Error(errorMessage));
      console.error('TeamContext: Error fetching team members:', err);
      logError('Failed to fetch team members', {
        error: err,
        context: { operation: 'fetchTeamMembers' },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set up real-time subscription to team_members table.
   * Handles INSERT, UPDATE, and DELETE events.
   */
  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('team_members_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          const newMember = transformDbTeamMember(payload.new as DbTeamMember);
          setTeamMembers((prev) => {
            // Check if member already exists (to handle race conditions)
            if (prev.some((m) => m.id === newMember.id)) {
              return prev;
            }
            // Insert in alphabetical order by name
            const updated = [...prev, newMember];
            updated.sort((a, b) => a.name.localeCompare(b.name));
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          const updatedMember = transformDbTeamMember(payload.new as DbTeamMember);
          setTeamMembers((prev) =>
            prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setTeamMembers((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  /**
   * Initialize: fetch data and set up real-time subscription on mount.
   */
  useEffect(() => {
    fetchTeamMembers();
    setupRealtimeSubscription();

    return () => {
      // Clean up subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchTeamMembers, setupRealtimeSubscription]);

  /**
   * Look up a team member by ID.
   */
  const getTeamMember = useCallback(
    (id: string | null): TeamMember | null => {
      if (!id) return null;
      return teamMembers.find((m) => m.id === id) ?? null;
    },
    [teamMembers]
  );

  /**
   * Add a new team member to the database.
   * Initials and avatar color are auto-generated if not provided.
   */
  const addTeamMember = useCallback(
    async (email: string, name: string): Promise<TeamMember> => {
      const initials = generateInitials(name);
      const avatarColor = generateAvatarColor(email);

      const { data, error: insertError } = await supabase
        .from('team_members')
        .insert({
          email,
          name,
          initials,
          avatar_color: avatarColor,
        })
        .select()
        .single();

      if (insertError) {
        logError('Failed to add team member', {
          error: insertError,
          context: { operation: 'addTeamMember', email, name },
        });
        throw new Error(insertError.message);
      }

      return transformDbTeamMember(data as DbTeamMember);
    },
    []
  );

  /**
   * Remove a team member from the database.
   */
  const removeTeamMember = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logError('Failed to remove team member', {
        error: deleteError,
        context: { operation: 'removeTeamMember', memberId: id },
      });
      throw new Error(deleteError.message);
    }
  }, []);

  /**
   * Invite a new team member by email using Supabase magic link (OTP).
   *
   * This approach sends a magic link to the user's email. When they click it,
   * they'll be authenticated and can set up their account.
   *
   * Note: For true admin invites (supabase.auth.admin.inviteUserByEmail),
   * you would need a Supabase Edge Function since the admin API cannot be
   * called from the client-side for security reasons.
   *
   * The invited user's team_member record will be created when they complete
   * the sign-up process through the magic link.
   */
  const inviteTeamMember = useCallback(
    async (email: string, name: string): Promise<InviteResult> => {
      try {
        // First, check if a team member with this email already exists
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', email)
          .single();

        if (existingMember) {
          return {
            success: false,
            message: 'A team member with this email already exists.',
          };
        }

        // Create a pending invitation record in team_members
        // This creates a placeholder that will be linked when the user accepts
        const initials = generateInitials(name);
        const avatarColor = generateAvatarColor(email);

        const { error: insertError } = await supabase
          .from('team_members')
          .insert({
            email,
            name,
            initials,
            avatar_color: avatarColor,
            user_id: null, // Will be populated when user accepts invite
          });

        if (insertError) {
          // Handle unique constraint violations
          if (insertError.code === '23505') {
            return {
              success: false,
              message: 'A team member with this email already exists.',
            };
          }
          throw new Error(insertError.message);
        }

        // Send magic link invitation email
        // The user will receive an email with a link to sign in/up
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            // Include metadata that can be used during signup
            data: {
              invited_name: name,
            },
          },
        });

        if (otpError) {
          // If OTP fails, we should remove the pending team member record
          await supabase
            .from('team_members')
            .delete()
            .eq('email', email)
            .is('user_id', null);

          throw new Error(otpError.message);
        }

        return {
          success: true,
          message: `Invitation sent to ${email}. They will receive an email with a link to join the team.`,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send invitation';
        logError('Failed to invite team member', {
          error: err,
          context: { operation: 'inviteTeamMember', email, name },
        });
        return {
          success: false,
          message: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Manually refetch team members.
   */
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  const value = useMemo<TeamContextValue>(
    () => ({
      teamMembers,
      isLoading,
      error,
      getTeamMember,
      addTeamMember,
      removeTeamMember,
      inviteTeamMember,
      refetch,
    }),
    [teamMembers, isLoading, error, getTeamMember, addTeamMember, removeTeamMember, inviteTeamMember, refetch]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

/**
 * Hook to access the team context.
 * Must be used within a TeamProvider.
 */
export function useTeam(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
