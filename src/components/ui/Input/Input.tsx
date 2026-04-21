import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import styles from './Input.module.css';
import { classNames } from '@/utils/helpers';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? `input-${generatedId}`;
    const errorId = `${inputId}-error`;
    const describedBy = [props['aria-describedby'], error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={styles.field}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={classNames(styles.input, error && styles.inputError, className)}
          {...props}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy}
        />
        {error && <span id={errorId} className={styles.error}>{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
