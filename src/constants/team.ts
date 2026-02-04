import type { TeamMember } from '../types/team';

/**
 * @deprecated Use useTeam() hook from context instead.
 * This constant is kept for backwards compatibility only.
 * Team members are now fetched from Supabase via TeamContext.
 *
 * Migration:
 * ```tsx
 * // Before
 * import { TEAM_MEMBERS } from '../constants/team';
 * const options = TEAM_MEMBERS.map(m => m.name);
 *
 * // After
 * import { useTeam } from '../context';
 * const { teamMembers } = useTeam();
 * const options = teamMembers.map(m => m.name);
 * ```
 */
export const TEAM_MEMBERS: TeamMember[] = [];

/**
 * @deprecated Use useTeam().getTeamMember() instead.
 * This function logs a deprecation warning and always returns null.
 * Team members are now managed via TeamContext with Supabase.
 *
 * Migration:
 * ```tsx
 * // Before
 * import { getTeamMember } from '../constants/team';
 * const member = getTeamMember(id);
 *
 * // After
 * import { useTeam } from '../context';
 * const { getTeamMember } = useTeam();
 * const member = getTeamMember(id);
 * ```
 */
export const getTeamMember = (id: string | null): TeamMember | null => {
  if (id) {
    console.warn(
      'getTeamMember() from constants/team is deprecated. ' +
      'Use useTeam().getTeamMember() from context instead. ' +
      'This function always returns null.'
    );
  }
  return null;
};
