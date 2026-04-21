import styles from './ServerInfoPanel.module.css';

interface Props {
  sqlServerIp?: string;
  sqlServerPort?: number;
  isServerAlive?: string;
}

export function ServerInfoPanel({ sqlServerIp, sqlServerPort, isServerAlive }: Props) {
  return (
    <div className={styles.panel}>
      <p className={styles.title}>SQL Server</p>
      <p className={styles.detail}>IP: {sqlServerIp ?? '-'}{sqlServerPort != null ? `:${sqlServerPort}` : ''}</p>
      <p className={styles.detail}>Alive: {isServerAlive ?? '-'}</p>
    </div>
  );
}
