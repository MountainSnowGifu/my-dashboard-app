import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import type {
  SqlServerDashboard,
  SqlServerDashboardList,
  SqlServerHealthDashboard,
  SqlServerSessionDashboard,
  SqlServerSessionDashboardList,
  SqlServerActiveRequest,
  SqlServerActiveRequestList,
  SqlServerDbStatusDashboard,
  SqlServerDbStatusDashboardList,
  SqlServerDbHealthDashboard,
  SqlServerOverallPerformanceDashboard,
  SqlServerBlockStatus,
  SqlServerBlockStatusList,
} from '@/features/dashboard/types';
import { dashboardWsUrl } from '@/features/dashboard/api/dashboardApi';

type WsStatus = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error';
type SqlServerMeta = Pick<SqlServerHealthDashboard, 'sqlServerIp' | 'sqlServerPort'> & {
  isServerAlive?: string;
};
type RawSqlServerDashboard = Omit<SqlServerDashboard, 'parentSqlServerDbName'>;

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30000;

const isDashboardRow = (value: unknown): value is RawSqlServerDashboard => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.avgReadMs === 'number' &&
    typeof row.avgWriteMs === 'number' &&
    typeof row.numOfReads === 'number' &&
    typeof row.numOfWrites === 'number' &&
    typeof row.sqlServerDbName === 'string' &&
    typeof row.typeDescription === 'string'
  );
};

const isSessionRow = (value: unknown): value is SqlServerSessionDashboard => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.sessionCount === 'number' &&
    typeof row.sessionSqlServerDbName === 'string'
  );
};

const isActiveRequestRow = (value: unknown): value is SqlServerActiveRequest => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.arCommand === 'string' &&
    typeof row.arCpuTime === 'number' &&
    typeof row.arLogicalReads === 'number' &&
    typeof row.arReads === 'number' &&
    typeof row.arSessionId === 'number' &&
    typeof row.arSqlServerDbName === 'string' &&
    typeof row.arStatus === 'string' &&
    typeof row.arTotalElapsedTime === 'number' &&
    typeof row.arWrites === 'number'
  );
};

const isDbStatusRow = (value: unknown): value is SqlServerDbStatusDashboard => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.dbsRecoveryModelDesc === 'string' &&
    typeof row.dbsSqlServerDbName === 'string' &&
    typeof row.dbsStateDesc === 'string' &&
    typeof row.dbsUserAccessDesc === 'string'
  );
};

const isBlockStatusRow = (value: unknown): value is SqlServerBlockStatus => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.bsResBlockingSessionId === 'number' &&
    typeof row.bsResCommand === 'string' &&
    typeof row.bsResDatabaseName === 'string' &&
    typeof row.bsResHostName === 'string' &&
    typeof row.bsResLoginName === 'string' &&
    typeof row.bsResProgramName === 'string' &&
    typeof row.bsResSessionId === 'number' &&
    typeof row.bsResSqlText === 'string' &&
    typeof row.bsResStatus === 'string' &&
    typeof row.bsResWaitResource === 'string' &&
    typeof row.bsResWaitTime === 'string' &&
    typeof row.bsResWaitType === 'string'
  );
};

const isDbHealthDashboard = (value: unknown): value is SqlServerDbHealthDashboard => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;

  const validFileIo = Array.isArray(row.mssqlFileIoDashboard) && row.mssqlFileIoDashboard.every(isDashboardRow);
  const validSession = isSessionRow(row.mssqlSessionDashboard);
  const validActive = Array.isArray(row.mssqlActiveRequestDashboard) && row.mssqlActiveRequestDashboard.every(isActiveRequestRow);
  const validDbStatus = isDbStatusRow(row.mssqlDbStatusDashboard);
  const validBlockStatus = Array.isArray(row.mssqlBlockStatusDashboard) && row.mssqlBlockStatusDashboard.every(isBlockStatusRow);

  return (
    typeof row.dbHealthSqlServerDbName === 'string' &&
    validDbStatus &&
    validFileIo &&
    validSession &&
    validActive &&
    validBlockStatus
  );
};

const isOverallPerformance = (value: unknown): value is SqlServerOverallPerformanceDashboard => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.pdbCounterName === 'string' &&
    typeof row.pdbCounterValue === 'number' &&
    typeof row.pdbInstanceName === 'string' &&
    typeof row.pdbObjectName === 'string'
  );
};

const normalizeOverallPerformance = (
  value: unknown,
): SqlServerOverallPerformanceDashboard[] => {
  const sanitize = (
    row: SqlServerOverallPerformanceDashboard,
  ): SqlServerOverallPerformanceDashboard => ({
    pdbCounterName: row.pdbCounterName.trim(),
    pdbCounterValue: row.pdbCounterValue,
    pdbInstanceName: row.pdbInstanceName.trim(),
    pdbObjectName: row.pdbObjectName.trim(),
  });

  if (isOverallPerformance(value)) {
    return [sanitize(value)];
  }

  if (Array.isArray(value)) {
    return value.filter(isOverallPerformance).map(sanitize);
  }

  return [];
};

type NormalizedPayload = {
  rows: SqlServerDashboardList;
  sessions: SqlServerSessionDashboardList;
  activeRequests: SqlServerActiveRequestList;
  dbStatuses: SqlServerDbStatusDashboardList;
  blockStatuses: SqlServerBlockStatusList;
  meta: SqlServerMeta | null;
  overallPerformances: SqlServerOverallPerformanceDashboard[];
};

const normalizeDashboardPayload = (payload: unknown): NormalizedPayload => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid dashboard payload');
  }

  const health = payload as Partial<SqlServerHealthDashboard>;

  if (
    !Array.isArray(health.mssqlDbHealthDashboards) ||
    !health.mssqlDbHealthDashboards.every(isDbHealthDashboard)
  ) {
    throw new Error('Invalid dashboard payload');
  }

  const rows = health.mssqlDbHealthDashboards.flatMap((db) =>
    db.mssqlFileIoDashboard.map((row) => ({
      ...row,
      parentSqlServerDbName: db.dbHealthSqlServerDbName,
    }))
  );
  const sessions = health.mssqlDbHealthDashboards.map((db) => db.mssqlSessionDashboard);
  const activeRequests = health.mssqlDbHealthDashboards.flatMap((db) => db.mssqlActiveRequestDashboard);
  const dbStatuses = health.mssqlDbHealthDashboards.map((db) => db.mssqlDbStatusDashboard);
  const blockStatuses = health.mssqlDbHealthDashboards.flatMap((db) => db.mssqlBlockStatusDashboard);

  return {
    rows,
    sessions,
    activeRequests,
    dbStatuses,
    blockStatuses,
    meta:
      typeof health.sqlServerIp === 'string' &&
      typeof health.sqlServerPort === 'number'
        ? {
            sqlServerIp: health.sqlServerIp,
            sqlServerPort: health.sqlServerPort,
            ...(typeof health.isServerAlive === 'string'
              ? { isServerAlive: health.isServerAlive }
              : {}),
          }
        : null,
    overallPerformances: normalizeOverallPerformance(health.mssqlOverallPerformanceDashboard),
  };
};

export function useSqlServerDashboard() {
  const [data, setData] = useState<SqlServerDashboardList | null>(null);
  const [sessions, setSessions] = useState<SqlServerSessionDashboardList | null>(null);
  const [activeRequests, setActiveRequests] = useState<SqlServerActiveRequestList | null>(null);
  const [dbStatuses, setDbStatuses] = useState<SqlServerDbStatusDashboardList | null>(null);
  const [blockStatuses, setBlockStatuses] = useState<SqlServerBlockStatusList>([]);
  const [serverMeta, setServerMeta] = useState<SqlServerMeta | null>(null);
  const [overallPerformances, setOverallPerformances] = useState<SqlServerOverallPerformanceDashboard[]>([]);
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const intentionalCloseRef = useRef(false);

  const connect = useCallback((mode: 'initial' | 'retry' = 'initial') => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const ws = new WebSocket(dashboardWsUrl);
    wsRef.current = ws;
    setStatus(mode === 'retry' ? 'reconnecting' : 'connecting');
    setError(null);

    ws.onopen = () => {
      retryCountRef.current = 0;
      setRetryCount(0);
      setNextRetryAt(null);
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const parsed = normalizeDashboardPayload(JSON.parse(event.data));
        setData(parsed.rows);
        setSessions(parsed.sessions);
        setActiveRequests(parsed.activeRequests);
        setDbStatuses(parsed.dbStatuses);
        setBlockStatuses(parsed.blockStatuses);
        setServerMeta(parsed.meta);
        setOverallPerformances(parsed.overallPerformances);
        setDataUpdatedAt(Date.now());
        setError(null);
      } catch {
        setError('Invalid data received from server');
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      } else if (wsRef.current !== null) {
        // A newer connection is already active; this is a stale close from an
        // old ws instance (e.g. onopen fired on the new ws before onclose fired
        // on the old one). Ignore it to avoid overwriting 'connected' status.
        return;
      }

      if (!shouldReconnectRef.current) {
        intentionalCloseRef.current = false;
        setStatus('disconnected');
        return;
      }

      if (intentionalCloseRef.current) {
        intentionalCloseRef.current = false;
        return;
      }

      const attempt = retryCountRef.current + 1;
      retryCountRef.current = attempt;
      setRetryCount(attempt);

      const delay = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS);
      const retryAt = Date.now() + delay;
      setNextRetryAt(retryAt);
      setStatus('reconnecting');

      reconnectTimerRef.current = setTimeout(() => connect('retry'), delay);
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect('initial');

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }
    };
  // connect is stable (useCallback with []) — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    retryCountRef.current = 0;
    setRetryCount(0);
    setNextRetryAt(null);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    connect('initial');
  }, [connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    retryCountRef.current = 0;
    setRetryCount(0);
    setNextRetryAt(null);
    setError('Disconnected manually');

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
      return;
    }

    setStatus('disconnected');
  }, []);

  return {
    data,
    sessions,
    activeRequests,
    dbStatuses,
    blockStatuses,
    serverMeta,
    overallPerformances,
    status,
    error,
    dataUpdatedAt,
    reconnect,
    disconnect,
    retryCount,
    nextRetryAt,
  };
}

export function useSqlServerConnections() {
  return useQuery({
    queryKey: ['dashboard', 'connections'],
    queryFn: dashboardApi.getConnections,
    refetchInterval: 10_000,
  });
}
