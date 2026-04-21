import { IconAlert, IconRefresh } from '@/components/icons';
import styles from './DashboardErrorBanner.module.css';

interface Props {
  error: string | null;
  onRetry: () => void;
  message?: string;
}

export function DashboardErrorBanner({ error, onRetry, message }: Props) {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>
        <IconAlert />
        <span>
          {message ??
            `Latest dashboard data could not be refreshed${error ? `: ${error}` : ''}. Showing last known data.`}
        </span>
      </span>
      <button className={styles.retryButton} onClick={onRetry}>
        <IconRefresh />
        <span>Refresh</span>
      </button>
    </div>
  );
}
