import styles from './DashboardStatusBadge.module.css';

type WsStatus = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error';

interface Props {
  status: WsStatus;
  retryCount: number;
  retryCountdown: number;
}

export function DashboardStatusBadge({ status, retryCount, retryCountdown }: Props) {
  const label =
    status === 'connected'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'reconnecting'
          ? `Reconnecting${retryCountdown > 0 ? ` in ${retryCountdown}s` : ''} (retry #${retryCount})`
          : status === 'error'
            ? 'Error'
            : 'Disconnected';

  const dotClass =
    status === 'connected'
      ? styles.dotOnline
      : status === 'error'
        ? styles.dotError
        : status === 'disconnected'
          ? styles.dotDisconnected
        : styles.dotConnecting;

  const textClass =
    status === 'connected'
      ? styles.textOnline
      : status === 'error'
        ? styles.textError
        : status === 'disconnected'
          ? styles.textDisconnected
        : styles.textConnecting;

  const isPulsing = status === 'connecting' || status === 'reconnecting';

  return (
    <span className={styles.row} role="status" aria-live="polite">
      <span
        className={`${styles.dot} ${dotClass}${isPulsing ? ` ${styles.dotPulsing}` : ''}`}
        aria-hidden="true"
      />
      <span className={textClass}>{label}</span>
    </span>
  );
}
