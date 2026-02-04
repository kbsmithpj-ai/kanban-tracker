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

/**
 * Predefined avatar colors for new team members.
 * Colors are assigned based on the hash of the member's email.
 */
const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#84CC16', // lime
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#10B981', // emerald
  '#EF4444', // red
  '#06B6D4', // cyan
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
      throw new Error(deleteError.message);
    }
  }, []);

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
      refetch,
    }),
    [teamMembers, isLoading, error, getTeamMember, addTeamMember, removeTeamMember, refetch]
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
