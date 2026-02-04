import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface BaseInputProps {
  label?: string;
  error?: string;
  showCharacterCount?: boolean;
  characterCountThreshold?: number;
}

interface InputFieldProps extends BaseInputProps, InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

interface TextareaProps extends BaseInputProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

type InputProps = InputFieldProps | TextareaProps;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ label, error, multiline, showCharacterCount, characterCountThreshold = 100, className = '', ...props }, ref) => {
    const inputClasses = [
      styles.input,
      multiline && styles.textarea,
      error && styles.error,
      className,
    ].filter(Boolean).join(' ');

    const maxLength = props.maxLength;
    const currentLength = typeof props.value === 'string' ? props.value.length : 0;
    const shouldShowCount = showCharacterCount && maxLength && currentLength >= (maxLength - characterCountThreshold);
    const remainingChars = maxLength ? maxLength - currentLength : 0;
    const isNearLimit = remainingChars <= 50;

    return (
      <div className={styles.inputWrapper}>
        {label && <label className={styles.label}>{label}</label>}
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={inputClasses}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={inputClasses}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        <div className={styles.inputFooter}>
          {error && <span className={styles.errorMessage}>{error}</span>}
          {shouldShowCount && (
            <span className={`${styles.characterCount} ${isNearLimit ? styles.characterCountWarning : ''}`}>
              {remainingChars} characters remaining
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
