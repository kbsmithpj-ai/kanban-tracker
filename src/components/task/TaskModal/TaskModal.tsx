import { useCallback, useMemo, useRef } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { TaskForm } from '../TaskForm';
import type { TaskFormRef, TaskFormData } from '../TaskForm';
import { useTasks } from '../../../context';
import { useUI } from '../../../context';
import styles from './TaskModal.module.css';

export function TaskModal() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { taskModal, closeTaskModal } = useUI();
  const formRef = useRef<TaskFormRef>(null);

  const task = useMemo(() => {
    if (!taskModal.taskId) return null;
    return tasks.find(t => t.id === taskModal.taskId) || null;
  }, [tasks, taskModal.taskId]);

  const handleSubmit = useCallback((data: TaskFormData) => {
    const taskData = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      category: data.category,
      priority: data.priority,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate || null,
    };

    if (task) {
      updateTask(task.id, taskData);
    } else {
      addTask(taskData);
    }
    closeTaskModal();
  }, [task, addTask, updateTask, closeTaskModal]);

  const handleDelete = useCallback(() => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      closeTaskModal();
    }
  }, [task, deleteTask, closeTaskModal]);

  const handleSaveClick = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const title = task ? 'Edit Task' : 'Create Task';

  const footer = (
    <div className={styles.footer}>
      <Button type="button" variant="ghost" onClick={closeTaskModal}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleSaveClick}>
        {task ? 'Save Changes' : 'Create Task'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={taskModal.isOpen}
      onClose={closeTaskModal}
      title={title}
      footer={footer}
    >
      <TaskForm
        ref={formRef}
        initialData={task}
        onSubmit={handleSubmit}
        onDelete={task ? handleDelete : undefined}
      />
    </Modal>
  );
}
