import { useEffect, useRef } from 'react';
import { useUI } from '../../../context';
import { FilterBar } from '../../filters';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUI();
  const sidebarRef = useRef<HTMLElement>(null);

  // Sync the inert attribute so keyboard focus cannot reach collapsed content.
  // React 19 supports the inert prop, but we use a ref for broad compatibility.
  useEffect(() => {
    if (sidebarRef.current) {
      if (!sidebarOpen) {
        sidebarRef.current.setAttribute('inert', '');
      } else {
        sidebarRef.current.removeAttribute('inert');
      }
    }
  }, [sidebarOpen]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}
        aria-label="Filters sidebar"
        aria-hidden={!sidebarOpen}
      >
        <FilterBar />
      </aside>
      <button
        className={styles.toggleButton}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Hide filters' : 'Show filters'}
        aria-expanded={sidebarOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none' }}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </>
  );
}
