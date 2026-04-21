export interface SqlServerDashboard {
  avgReadMs: number;
  avgWriteMs: number;
  numOfReads: number;
  numOfWrites: number;
  sqlServerDbName: string;
  typeDescription: string;
  parentSqlServerDbName: string;
}

export type SqlServerDashboardList = SqlServerDashboard[];

export interface SqlServerSessionDashboard {
  sessionCount: number;
  sessionSqlServerDbName: string;
}

export type SqlServerSessionDashboardList = SqlServerSessionDashboard[];

export interface SqlServerActiveRequest {
  arCommand: string;
  arCpuTime: number;
  arLogicalReads: number;
  arReads: number;
  arSessionId: number;
  arSqlServerDbName: string;
  arStatus: string;
  arTotalElapsedTime: number;
  arWrites: number;
}

export type SqlServerActiveRequestList = SqlServerActiveRequest[];

export interface SqlServerDbStatusDashboard {
  dbsRecoveryModelDesc: string;
  dbsSqlServerDbName: string;
  dbsStateDesc: string;
  dbsUserAccessDesc: string;
}

export type SqlServerDbStatusDashboardList = SqlServerDbStatusDashboard[];

export interface SqlServerDbHealthDashboard {
  sqlServerDbName: string;
  mssqlDbStatusDashboard: SqlServerDbStatusDashboard;
  mssqlFileIoDashboard: SqlServerDashboardList;
  mssqlSessionDashboard: SqlServerSessionDashboard;
  mssqlActiveRequestDashboard: SqlServerActiveRequestList;
}

export interface SqlServerOverallPerformanceDashboard {
  pdbCounterName: string;
  pdbCounterValue: number;
  pdbInstanceName: string;
  pdbObjectName: string;
}

export interface SqlServerHealthDashboard {
  isServerAlive?: string;
  sqlServerIp: string;
  sqlServerPort: number;
  mssqlDbHealthDashboards: SqlServerDbHealthDashboard[];
  mssqlOverallPerformanceDashboard:
    | SqlServerOverallPerformanceDashboard
    | SqlServerOverallPerformanceDashboard[];
}

export interface SqlServerConnections {
  connections: number;
}
