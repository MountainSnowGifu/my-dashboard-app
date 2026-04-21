import styles from './Loading.module.css';
import { classNames } from '@/utils/helpers';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  message?: string;
}

export function Loading({ size = 'md', fullPage = false, message }: LoadingProps) {
  return (
    <div className={classNames(styles.container, fullPage && styles.fullPage)} role="status" aria-live="polite">
      <div className={classNames(styles.spinner, styles[size])} />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
