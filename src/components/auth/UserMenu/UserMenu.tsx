import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../common';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const { user, teamMember, isAdmin, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Close dropdown when clicking outside.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Close dropdown on Escape key.
   */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = useCallback(async () => {
    setIsOpen(false);
    await signOut();
  }, [signOut]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Don't render if no user is authenticated
  if (!user || !teamMember) {
    return null;
  }

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div
          className={styles.avatar}
          style={{ backgroundColor: teamMember.avatar_color }}
        >
          {teamMember.initials}
        </div>
        <span className={styles.name}>{teamMember.name}</span>
        {isAdmin && (
          <span className={styles.adminBadge}>Admin</span>
        )}
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.userInfo}>
            <div className={styles.userName}>{teamMember.name}</div>
            <div className={styles.email}>{user.email}</div>
          </div>
          <div className={styles.dropdownActions}>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className={styles.signOutButton}
              role="menuitem"
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
