import { useTeam } from '../../../context';
import styles from './Avatar.module.css';

interface AvatarProps {
  memberId: string | null;
  size?: 'small' | 'medium' | 'large';
}

export function Avatar({ memberId, size = 'medium' }: AvatarProps) {
  const { getTeamMember } = useTeam();
  const member = getTeamMember(memberId);

  const classes = [
    styles.avatar,
    styles[size],
    !member && styles.unassigned,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={member ? { backgroundColor: member.avatarColor } : undefined}
      title={member?.name || 'Unassigned'}
      aria-label={member?.name || 'Unassigned'}
    >
      {member ? member.initials : '?'}
    </div>
  );
}
