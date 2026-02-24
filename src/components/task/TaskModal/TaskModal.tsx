import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { TaskForm } from '../TaskForm';
import type { TaskFormRef, TaskFormData } from '../TaskForm';
import { useTasks, useUI, useToast } from '../../../context';
import styles from './TaskModal.module.css';

export function TaskModal() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { taskModal, closeTaskModal } = useUI();
  const { showError } = useToast();
  const formRef = useRef<TaskFormRef>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task = useMemo(() => {
    if (!taskModal.taskId) return null;
    return tasks.find(t => t.id === taskModal.taskId) || null;
  }, [tasks, taskModal.taskId]);

  const handleSubmit = useCallback(async (data: TaskFormData) => {
    const taskData = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      category: data.category,
      priority: data.priority,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate || null,
    };

    setIsSaving(true);
    try {
      if (task) {
        await updateTask(task.id, taskData);
      } else {
        await addTask(taskData);
      }
      closeTaskModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      const action = task ? 'update' : 'create';
      showError(`Failed to ${action} task: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [task, addTask, updateTask, closeTaskModal, showError]);

  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!task) return;

    setIsSaving(true);
    try {
      await deleteTask(task.id);
      setShowDeleteConfirm(false);
      closeTaskModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      showError(`Failed to delete task: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [task, deleteTask, closeTaskModal, showError]);

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    closeTaskModal();
  }, [closeTaskModal]);

  const handleSaveClick = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const title = task ? 'Edit Task' : 'Create Task';

  const footer = (
    <div className={styles.footer}>
      <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleSaveClick} disabled={isSaving}>
        {isSaving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={taskModal.isOpen}
      onClose={handleClose}
      title={title}
      footer={footer}
    >
      <TaskForm
        ref={formRef}
        initialData={task}
        onSubmit={handleSubmit}
        onDelete={task ? handleDeleteRequest : undefined}
      />
      {showDeleteConfirm && (
        <div className={styles.deleteConfirm} role="alert">
          <p className={styles.deleteConfirmMessage}>
            Are you sure you want to delete this task? This cannot be undone.
          </p>
          <div className={styles.deleteConfirmActions}>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={handleDeleteCancel}
              disabled={isSaving}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="small"
              onClick={handleDeleteConfirm}
              disabled={isSaving}
              aria-label="Confirm delete task"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
