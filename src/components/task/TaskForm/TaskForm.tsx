import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Task, TaskStatus, TaskCategory, TaskPriority } from '../../../types/task';
import { CATEGORIES, isValidCategory } from '../../../constants/categories';
import { STATUSES, isValidStatus } from '../../../constants/statuses';
import { useTeam } from '../../../context';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Select } from '../../common/Select';
import styles from './TaskForm.module.css';

const DESCRIPTION_MAX_LENGTH = 2000;
const VALID_PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);

const isValidPriority = (value: string): value is TaskPriority =>
  VALID_PRIORITIES.has(value as TaskPriority);

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
}

export interface TaskFormRef {
  submit: () => void;
  getData: () => TaskFormData;
  validate: () => boolean;
}

interface TaskFormProps {
  initialData?: Task | null;
  onSubmit: (data: TaskFormData) => void;
  onDelete?: () => void;
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  status: 'planning',
  category: 'seed-pro',
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
};

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TaskForm = forwardRef<TaskFormRef, TaskFormProps>(
  function TaskForm({ initialData, onSubmit, onDelete }, ref) {
    const { teamMembers } = useTeam();
    const [formData, setFormData] = useState<TaskFormData>(() => {
      if (initialData) {
        return {
          title: initialData.title,
          description: initialData.description || '',
          status: initialData.status,
          category: initialData.category,
          priority: initialData.priority,
          assigneeId: initialData.assigneeId || '',
          dueDate: initialData.dueDate || '',
        };
      }
      return defaultFormData;
    });

    const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

    const handleChange = useCallback((field: keyof TaskFormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }, []);

    const validate = useCallback((): boolean => {
      const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }

      if (!isValidCategory(formData.category)) {
        newErrors.category = 'Invalid category selected';
      }

      if (!isValidStatus(formData.status)) {
        newErrors.status = 'Invalid status selected';
      }

      if (!isValidPriority(formData.priority)) {
        newErrors.priority = 'Invalid priority selected';
      }

      if (formData.description.length > DESCRIPTION_MAX_LENGTH) {
        newErrors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [formData.title, formData.category, formData.status, formData.priority, formData.description]);

    const handleSubmit = useCallback(() => {
      if (validate()) {
        const sanitizedData: TaskFormData = {
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim(),
        };
        onSubmit(sanitizedData);
      }
    }, [formData, validate, onSubmit]);

    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
      getData: () => formData,
      validate,
    }), [handleSubmit, formData, validate]);

    const categoryOptions = CATEGORIES.map(c => ({ value: c.id, label: c.label }));
    const statusOptions = STATUSES.filter(s => s.id !== 'past-due').map(s => ({ value: s.id, label: s.label }));
    const assigneeOptions = teamMembers.map(m => ({ value: m.id, label: m.name }));

    return (
      <div className={styles.form} role="form" aria-label="Task form">
        <div className={styles.fullWidth}>
          <Input
            label="Title"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            error={errors.title}
            placeholder="Enter task title..."
            autoFocus
            aria-required="true"
          />
        </div>

        <div className={styles.fullWidth}>
          <Input
            label="Description"
            multiline
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Enter task description (optional)..."
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
            showCharacterCount
            characterCountThreshold={200}
            error={errors.description}
          />
        </div>

        <div className={styles.row}>
          <Select
            label="Category"
            value={formData.category}
            onChange={e => handleChange('category', e.target.value)}
            options={categoryOptions}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={e => handleChange('status', e.target.value)}
            options={statusOptions}
          />
        </div>

        <div className={styles.row}>
          <Select
            label="Assignee"
            value={formData.assigneeId}
            onChange={e => handleChange('assigneeId', e.target.value)}
            options={assigneeOptions}
            placeholder="Unassigned"
          />
          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={e => handleChange('dueDate', e.target.value)}
          />
        </div>

        <fieldset className={styles.priorityGroup}>
          <legend className={styles.priorityLabel}>Priority</legend>
          <div className={styles.priorityOptions} role="group" aria-label="Task priority">
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                aria-pressed={formData.priority === p.value}
                className={`${styles.priorityOption} ${styles[`priority${p.label}`]} ${
                  formData.priority === p.value ? styles.selected : ''
                }`}
                onClick={() => handleChange('priority', p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        {initialData && onDelete && (
          <div className={styles.deleteSection}>
            <p className={styles.deleteWarning}>
              This action cannot be undone.
            </p>
            <Button type="button" variant="danger" onClick={onDelete}>
              Delete Task
            </Button>
          </div>
        )}
      </div>
    );
  }
);
