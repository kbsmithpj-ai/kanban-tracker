import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: ReactNode;
  color: string;
  backgroundColor: string;
  borderColor?: string;
}

export function Badge({ children, color, backgroundColor, borderColor }: BadgeProps) {
  return (
    <span
      className={styles.badge}
      style={{
        color,
        backgroundColor,
        borderColor: borderColor || color,
      }}
    >
      {children}
    </span>
  );
}
