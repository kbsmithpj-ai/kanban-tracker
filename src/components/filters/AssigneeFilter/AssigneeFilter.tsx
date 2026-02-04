import { useTeam } from '../../../context';
import { useFilters } from '../../../hooks/useFilters';
import styles from './AssigneeFilter.module.css';

export function AssigneeFilter() {
  const { teamMembers } = useTeam();
  const { filters, setAssignee } = useFilters();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setAssignee(value || null);
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>Assignee</label>
      <select
        className={styles.select}
        value={filters.assigneeId || ''}
        onChange={handleChange}
      >
        <option value="">All Team Members</option>
        {teamMembers.map(member => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
