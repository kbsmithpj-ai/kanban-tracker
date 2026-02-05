/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { parseISO } from 'date-fns';
import { toISODateString } from '../utils/date';

export type ViewMode = 'kanban' | 'month' | 'week' | 'day';

interface TaskModalState {
  isOpen: boolean;
  taskId: string | null; // null for new task, id for edit
}

interface InviteModalState {
  isOpen: boolean;
}

interface ErrorLogModalState {
  isOpen: boolean;
}

interface UIContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /**
   * The currently selected date as a Date object.
   * IMPORTANT: This is derived from internal ISO string storage.
   * Consumers should treat this as read-only and never mutate it directly.
   * Use setSelectedDate() to change the selected date.
   */
  selectedDate: Date;
  /**
   * Updates the selected date. Accepts a Date object which will be
   * stored internally as an ISO string to prevent mutation issues.
   */
  setSelectedDate: (date: Date) => void;
  taskModal: TaskModalState;
  openTaskModal: (taskId?: string | null) => void;
  closeTaskModal: () => void;
  inviteModal: InviteModalState;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  errorLogModal: ErrorLogModalState;
  openErrorLogModal: () => void;
  closeErrorLogModal: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  // Store date as ISO string internally to prevent mutation issues.
  // This ensures React's change detection works correctly and prevents
  // accidental mutations by consumers.
  const [selectedDateISO, setSelectedDateISO] = useState<string>(toISODateString(new Date()));
  const [taskModal, setTaskModal] = useState<TaskModalState>({ isOpen: false, taskId: null });
  const [inviteModal, setInviteModal] = useState<InviteModalState>({ isOpen: false });
  const [errorLogModal, setErrorLogModal] = useState<ErrorLogModalState>({ isOpen: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Convert ISO string to Date object for consumers.
  // Create a new Date on each render to maintain immutability contract.
  const selectedDate = useMemo(() => parseISO(selectedDateISO), [selectedDateISO]);

  // Accept Date object from consumers, store as ISO string internally.
  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateISO(toISODateString(date));
  }, []);

  const openTaskModal = useCallback((taskId: string | null = null) => {
    setTaskModal({ isOpen: true, taskId });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModal({ isOpen: false, taskId: null });
  }, []);

  const openInviteModal = useCallback(() => {
    setInviteModal({ isOpen: true });
  }, []);

  const closeInviteModal = useCallback(() => {
    setInviteModal({ isOpen: false });
  }, []);

  const openErrorLogModal = useCallback(() => {
    setErrorLogModal({ isOpen: true });
  }, []);

  const closeErrorLogModal = useCallback(() => {
    setErrorLogModal({ isOpen: false });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const value = useMemo(() => ({
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    taskModal,
    openTaskModal,
    closeTaskModal,
    inviteModal,
    openInviteModal,
    closeInviteModal,
    errorLogModal,
    openErrorLogModal,
    closeErrorLogModal,
    sidebarOpen,
    toggleSidebar,
  }), [viewMode, selectedDate, setSelectedDate, taskModal, openTaskModal, closeTaskModal, inviteModal, openInviteModal, closeInviteModal, errorLogModal, openErrorLogModal, closeErrorLogModal, sidebarOpen, toggleSidebar]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
