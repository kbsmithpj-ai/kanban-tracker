import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className = '', ...props }, ref) => {
    const generatedId = useId();
    const selectId = props.id || generatedId;

    return (
      <div className={styles.selectWrapper}>
        {label && <label className={styles.label} htmlFor={selectId}>{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={`${styles.select} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
