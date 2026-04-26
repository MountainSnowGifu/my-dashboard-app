import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  useSqlServerDashboard,
  useSqlServerConnections,
} from "@/features/dashboard/hooks/useDashboard";
import type {
  MssqlBackupDashboard,
  MssqlLogUsageDashboard,
} from "@/features/dashboard/types";
import { ServerInfoPanel } from "@/features/dashboard/components/ServerInfoPanel";
import { DashboardStatusBadge } from "@/features/dashboard/components/DashboardStatusBadge";
import { DashboardErrorBanner } from "@/features/dashboard/components/DashboardErrorBanner";
import { Loading } from "@/components/common/Loading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  IconDatabase,
  IconAlert,
  IconLabel,
  IconLink,
  IconRefresh,
} from "@/components/icons";
import styles from "./DashboardPage.module.css";

const STALE_THRESHOLD_MS = 30_000;
const ELAPSED_WARN_MS = 5_000;
const ELAPSED_DANGER_MS = 30_000;
const CPU_WARN_MS = 5_000;
const CPU_DANGER_MS = 30_000;

type DashboardTab = "databases" | "performance" | "connections";

const TAB_ORDER: DashboardTab[] = ["databases", "performance", "connections"];

const formatBackupDateTime = (value: string) => {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

export function DashboardPage() {
  const {
    data,
    sessions,
    activeRequests,
    dbStatuses,
    blockStatuses,
    serverMeta,
    overallPerformances,
    logUsages,
    backups,
    status,
    error,
    dataUpdatedAt,
    reconnect,
    disconnect,
    retryCount,
    nextRetryAt,
  } = useSqlServerDashboard();
  const { data: connectionsData } = useSqlServerConnections();
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("databases");
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuButtonRef = useRef<HTMLButtonElement>(null);
  const actionMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isActionMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!actionMenuRef.current?.contains(e.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isActionMenuOpen]);

  useEffect(() => {
    if (isActionMenuOpen) {
      actionMenuItemRefs.current[0]?.focus();
    }
  }, [isActionMenuOpen]);

  useEffect(() => {
    if (!nextRetryAt) {
      setRetryCountdown(0);
      return;
    }
    const update = () =>
      setRetryCountdown(
        Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000)),
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextRetryAt]);

  const groupedData = useMemo(() => {
    const groups = new Map<
      string,
      {
        dbName: string;
        sessionCount: number;
        dbStatus: {
          state: string;
          access: string;
          recoveryModel: string;
        } | null;
        rows: NonNullable<typeof data>;
        activeRequests: NonNullable<typeof activeRequests>;
        blockStatuses: NonNullable<typeof blockStatuses>;
        logUsage: MssqlLogUsageDashboard | null;
        backups: MssqlBackupDashboard[];
      }
    >();

    (data ?? []).forEach((row) => {
      const dbName = row.parentSqlServerDbName;
      const group = groups.get(dbName) ?? {
        dbName,
        sessionCount: 0,
        dbStatus: null,
        rows: [],
        activeRequests: [],
        blockStatuses: [],
        logUsage: null,
        backups: [],
      };
      group.rows.push(row);
      groups.set(dbName, group);
    });

    (sessions ?? []).forEach((session) => {
      const dbName = session.sessionSqlServerDbName;
      const group = groups.get(dbName) ?? {
        dbName,
        sessionCount: 0,
        dbStatus: null,
        rows: [],
        activeRequests: [],
        blockStatuses: [],
        logUsage: null,
        backups: [],
      };
      group.sessionCount = session.sessionCount;
      groups.set(dbName, group);
    });

    (activeRequests ?? []).forEach((request) => {
      const dbName = request.arSqlServerDbName;
      const group = groups.get(dbName) ?? {
        dbName,
        sessionCount: 0,
        dbStatus: null,
        rows: [],
        activeRequests: [],
        blockStatuses: [],
        logUsage: null,
        backups: [],
      };
      group.activeRequests.push(request);
      groups.set(dbName, group);
    });

    (dbStatuses ?? []).forEach((statusRow) => {
      const dbName = statusRow.dbsSqlServerDbName;
      const group = groups.get(dbName) ?? {
        dbName,
        sessionCount: 0,
        dbStatus: null,
        rows: [],
        activeRequests: [],
        blockStatuses: [],
        logUsage: null,
        backups: [],
      };
      group.dbStatus = {
        state: statusRow.dbsStateDesc,
        access: statusRow.dbsUserAccessDesc,
        recoveryModel: statusRow.dbsRecoveryModelDesc,
      };
      groups.set(dbName, group);
    });

    (blockStatuses ?? []).forEach((bs) => {
      const dbName = bs.bsResDatabaseName;
      const group = groups.get(dbName) ?? {
        dbName,
        sessionCount: 0,
        dbStatus: null,
        rows: [],
        activeRequests: [],
        blockStatuses: [],
        logUsage: null,
        backups: [],
      };
      group.blockStatuses.push(bs);
      groups.set(dbName, group);
    });

    const logUsageMap = new Map(logUsages.map((lu) => [lu.lugSqlServerDbName, lu]));
    const backupMap = new Map<string, MssqlBackupDashboard[]>();
    backups.forEach((backup) => {
      const rows = backupMap.get(backup.bakSqlServerDbName) ?? [];
      rows.push(backup);
      backupMap.set(backup.bakSqlServerDbName, rows);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: group.rows,
        logUsage: logUsageMap.get(group.dbName) ?? null,
        backups: [...(backupMap.get(group.dbName) ?? [])].sort((a, b) =>
          b.bakBackupFinishDate.localeCompare(a.bakBackupFinishDate),
        ),
        activeRequests: [...group.activeRequests].sort((a, b) => {
          const aBlocked =
            a.arStatus.trim().toLowerCase() === "blocked" ? 0 : 1;
          const bBlocked =
            b.arStatus.trim().toLowerCase() === "blocked" ? 0 : 1;
          if (aBlocked !== bBlocked) return aBlocked - bBlocked;
          return b.arTotalElapsedTime - a.arTotalElapsedTime;
        }),
      }))
      .sort((a, b) => {
        const aOnline = a.dbStatus?.state === "ONLINE" ? 0 : 1;
        const bOnline = b.dbStatus?.state === "ONLINE" ? 0 : 1;
        if (aOnline !== bOnline) return aOnline - bOnline;
        return a.dbName.localeCompare(b.dbName, "ja");
      });
  }, [activeRequests, backups, blockStatuses, data, dbStatuses, sessions, logUsages]);

  const isSectionCollapsed = (group: (typeof groupedData)[number]) =>
    !expandedSections.has(group.dbName);

  const toggleSection = (dbName: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(dbName)) next.delete(dbName);
      else next.add(dbName);
      return next;
    });
  };

  const isLoading =
    !data && (status === "connecting" || status === "reconnecting");
  const loadingMessage =
    status === "reconnecting"
      ? `Reconnecting... retry #${retryCount}${retryCountdown > 0 ? ` in ${retryCountdown}s` : ""}`
      : "Loading SQL Server status...";

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "-";

  const handleDisconnectConfirm = () => {
    disconnect();
    setIsDisconnectModalOpen(false);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: DashboardTab,
  ) => {
    let nextTab: DashboardTab | null = null;

    if (event.key === "ArrowRight") {
      nextTab = TAB_ORDER[(TAB_ORDER.indexOf(tab) + 1) % TAB_ORDER.length];
    }

    if (event.key === "ArrowLeft") {
      nextTab =
        TAB_ORDER[
          (TAB_ORDER.indexOf(tab) - 1 + TAB_ORDER.length) % TAB_ORDER.length
        ];
    }

    if (event.key === "Home") {
      nextTab = TAB_ORDER[0];
    }

    if (event.key === "End") {
      nextTab = TAB_ORDER[TAB_ORDER.length - 1];
    }

    if (!nextTab) {
      return;
    }

    event.preventDefault();
    setActiveTab(nextTab);
    document.getElementById(`dashboard-tab-${nextTab}`)?.focus();
  };

  const handleActionMenuKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    const items = actionMenuItemRefs.current.filter(
      (item): item is HTMLButtonElement => Boolean(item && !item.disabled),
    );
    const activeIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setIsActionMenuOpen(false);
      actionMenuButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        activeIndex === -1
          ? 0
          : (activeIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const showErrorBanner =
    serverMeta?.isServerAlive?.trim().toLowerCase() === "no" ||
    status === "error" ||
    status === "disconnected" ||
    (status === "reconnecting" &&
      dataUpdatedAt !== null &&
      Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS);

  const isServerAliveNo =
    serverMeta?.isServerAlive?.trim().toLowerCase() === "no";

  const getRequestStatusClassName = (requestStatus: string) => {
    const normalized = requestStatus.trim().toLowerCase();
    if (normalized === "running" || normalized === "runnable")
      return styles.requestStatusRunning;
    if (normalized === "suspended") return styles.requestStatusSuspended;
    if (normalized === "blocked") return styles.requestStatusBlocked;
    return styles.requestStatusUnknown;
  };

  const getNumericCellClass = (value: number, warn: number, danger: number) => {
    if (value >= danger) return `${styles.tdNum} ${styles.tdDanger}`;
    if (value >= warn) return `${styles.tdNum} ${styles.tdWarning}`;
    return styles.tdNum;
  };

  return (
    <div className={styles.page}>
      {showErrorBanner && (
        <DashboardErrorBanner
          error={error}
          onRetry={reconnect}
          message={
            isServerAliveNo
              ? "SQL Server health check returned Alive: No. Monitoring data may be incomplete."
              : undefined
          }
        />
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>SQL Server</h1>
        <div className={styles.headerRight}>
          <ServerInfoPanel
            sqlServerIp={serverMeta?.sqlServerIp}
            sqlServerPort={serverMeta?.sqlServerPort}
            isServerAlive={serverMeta?.isServerAlive}
          />
          <DashboardStatusBadge
            status={status}
            retryCount={retryCount}
            retryCountdown={retryCountdown}
          />
          <span className={styles.lastUpdated}>
            Updated {lastUpdated}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={styles.actionButton}
            onClick={() => reconnect()}
            aria-label="Reconnect monitoring"
          >
            <IconRefresh />
            <span>Reconnect</span>
          </Button>
          <div className={styles.actionMenu} ref={actionMenuRef}>
            <Button
              ref={actionMenuButtonRef}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsActionMenuOpen((p) => !p)}
              aria-label="Connection actions"
              aria-expanded={isActionMenuOpen}
              aria-haspopup="menu"
            >
              •••
            </Button>
            {isActionMenuOpen && (
              <div
                className={styles.actionMenuDropdown}
                role="menu"
                onKeyDown={handleActionMenuKeyDown}
              >
                <button
                  ref={(element) => {
                    actionMenuItemRefs.current[0] = element;
                  }}
                  role="menuitem"
                  className={styles.actionMenuItem}
                  disabled={status === "disconnected"}
                  onClick={() => {
                    setIsDisconnectModalOpen(true);
                    setIsActionMenuOpen(false);
                  }}
                >
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Dashboard sections"
      >
        <button
          id="dashboard-tab-databases"
          role="tab"
          aria-selected={activeTab === "databases"}
          aria-controls="dashboard-panel-databases"
          tabIndex={activeTab === "databases" ? 0 : -1}
          className={`${styles.tab} ${activeTab === "databases" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("databases")}
          onKeyDown={(event) => handleTabKeyDown(event, "databases")}
        >
          Databases
        </button>
        <button
          id="dashboard-tab-performance"
          role="tab"
          aria-selected={activeTab === "performance"}
          aria-controls="dashboard-panel-overall-performance"
          tabIndex={activeTab === "performance" ? 0 : -1}
          className={`${styles.tab} ${activeTab === "performance" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("performance")}
          onKeyDown={(event) => handleTabKeyDown(event, "performance")}
        >
          Performance
        </button>
        <button
          id="dashboard-tab-connections"
          role="tab"
          aria-selected={activeTab === "connections"}
          aria-controls="dashboard-panel-connections"
          tabIndex={activeTab === "connections" ? 0 : -1}
          className={`${styles.tab} ${activeTab === "connections" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("connections")}
          onKeyDown={(event) => handleTabKeyDown(event, "connections")}
        >
          Connections
        </button>
      </div>

      <section
        id="dashboard-panel-connections"
        role="tabpanel"
        aria-labelledby="dashboard-tab-connections"
        tabIndex={0}
        hidden={activeTab !== "connections"}
      >
        <div className={styles.connectionsGrid}>
          <Card>
            <div className={styles.cardIconRow}>
              <span className={styles.cardIcon}>
                <IconLink />
              </span>
              <p className={styles.cardLabel}>Active Connections</p>
            </div>
            <p className={styles.cardValue}>
              {connectionsData?.connections.toLocaleString() ?? "-"}
            </p>
          </Card>
        </div>
      </section>

      <section
        id="dashboard-panel-overall-performance"
        role="tabpanel"
        aria-labelledby="dashboard-tab-performance"
        tabIndex={0}
        hidden={activeTab !== "performance"}
      >
        {overallPerformances.length > 0 ? (
          <div className={styles.overallGrid}>
            {overallPerformances.map((metric, index) => (
              <Card
                className={styles.metricCard}
                key={`${metric.pdbObjectName}-${metric.pdbCounterName}-${metric.pdbInstanceName || index}`}
              >
                <p className={styles.metricObject}>{metric.pdbObjectName}</p>
                <p className={styles.metricCounter}>{metric.pdbCounterName}</p>
                <p className={styles.cardValue}>
                  {metric.pdbCounterValue.toLocaleString()}
                </p>
                <p className={styles.cardMeta}>{metric.pdbInstanceName || "-"}</p>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <IconAlert />
            <span>No performance data</span>
          </div>
        )}
      </section>

      <section
        id="dashboard-panel-databases"
        role="tabpanel"
        aria-labelledby="dashboard-tab-databases"
        tabIndex={0}
        hidden={activeTab !== "databases"}
      >
        {isLoading && <Loading message={loadingMessage} />}

        {!isLoading && groupedData.length > 0
          ? groupedData.map((group) => (
              <section key={group.dbName} className={styles.dbSection}>
                {(() => {
                  const isOnline = group.dbStatus?.state === "ONLINE";
                  const collapsed = isSectionCollapsed(group);
                  return (
                    <>
                      <button
                        type="button"
                        className={styles.dbTitleRow}
                        onClick={() => toggleSection(group.dbName)}
                        aria-expanded={!collapsed}
                        aria-label={`${collapsed ? "Expand" : "Collapse"} ${group.dbName} database details`}
                      >
                        <span
                          className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ""}`}
                        >
                          ▼
                        </span>
                        <h3 className={styles.dbTitle}>{group.dbName}</h3>
                        <span className={styles.dbMetaInline}>
                          <span className={styles.dbMetaChip}>
                            Sessions: {group.sessionCount.toLocaleString()}
                          </span>
                          {group.dbStatus && (
                            <>
                              <span
                                className={`${styles.dbMetaChip} ${
                                  isOnline ? styles.stateOnline : styles.stateOffline
                                }`}
                              >
                                State: {group.dbStatus.state}
                              </span>
                              <span className={styles.dbMetaChip}>
                                Access: {group.dbStatus.access}
                              </span>
                              <span className={styles.dbMetaChip}>
                                Recovery: {group.dbStatus.recoveryModel}
                              </span>
                            </>
                          )}
                        </span>
                      </button>

                      {!collapsed && (
                        <>
                          {group.logUsage && (
                            <>
                              <div className={styles.subSectionHeader}>
                                <h4 className={styles.subSectionTitle}>
                                  Log Usage
                                </h4>
                              </div>
                              <div className={styles.logUsageSection}>
                                <div className={styles.logUsageBarRow}>
                                  <div className={styles.logUsageBar}>
                                    <div
                                      className={`${styles.logUsageBarFill} ${
                                        group.logUsage.lugAlertLevel.toUpperCase() === 'DANGER'
                                          ? styles.logUsageBarFillDanger
                                          : group.logUsage.lugAlertLevel.toUpperCase() === 'WARNING'
                                          ? styles.logUsageBarFillWarning
                                          : styles.logUsageBarFillOk
                                      }`}
                                      style={{ width: `${Math.min(group.logUsage.lugUsedLogSpacePercent, 100)}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`${styles.logAlertBadge} ${
                                      group.logUsage.lugAlertLevel.toUpperCase() === 'DANGER'
                                        ? styles.logAlertDanger
                                        : group.logUsage.lugAlertLevel.toUpperCase() === 'WARNING'
                                        ? styles.logAlertWarning
                                        : styles.logAlertOk
                                    }`}
                                  >
                                    {group.logUsage.lugAlertLevel}
                                  </span>
                                </div>
                                <span className={styles.logUsageMeta}>
                                  {group.logUsage.lugUsedLogSpaceMB.toFixed(2)} MB / {group.logUsage.lugTotalLogSizeMB.toFixed(2)} MB ({group.logUsage.lugUsedLogSpacePercent.toFixed(1)}%)
                                </span>
                              </div>
                            </>
                          )}

                          <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>
                                    <span className={styles.thIcon}>
                                      <IconDatabase />
                                    </span>
                                    File Name
                                  </th>
                                  <th className={styles.th}>
                                    <span className={styles.thIcon}>
                                      <IconLabel />
                                    </span>
                                    Type
                                  </th>
                                  <th className={styles.th}>Reads</th>
                                  <th className={styles.th}>Writes</th>
                                  <th className={styles.th}>Avg Read (ms)</th>
                                  <th className={styles.th}>Avg Write (ms)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.rows.length > 0 ? (
                                  group.rows.map((row) => (
                                    <tr
                                      key={`${group.dbName}-${row.sqlServerDbName}-${row.typeDescription}`}
                                      className={styles.tr}
                                    >
                                      <td className={styles.td}>
                                        {row.sqlServerDbName}
                                      </td>
                                      <td className={styles.td}>
                                        {row.typeDescription}
                                      </td>
                                      <td className={styles.tdNum}>
                                        {row.numOfReads.toLocaleString()}
                                      </td>
                                      <td className={styles.tdNum}>
                                        {row.numOfWrites.toLocaleString()}
                                      </td>
                                      <td className={styles.tdNum}>
                                        {row.avgReadMs.toLocaleString()}
                                      </td>
                                      <td className={styles.tdNum}>
                                        {row.avgWriteMs.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td className={styles.tdEmpty} colSpan={6}>
                                      No file I/O data
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className={styles.subSectionHeader}>
                            <h4 className={styles.subSectionTitle}>
                              Active Requests
                            </h4>
                          </div>
                          {group.activeRequests.length > 0 ? (
                            <div className={styles.tableWrapper}>
                              <table className={styles.table}>
                                <thead>
                                  <tr>
                                    <th className={styles.th}>Session ID</th>
                                    <th className={styles.th}>Command</th>
                                    <th className={styles.th}>Status</th>
                                    <th className={styles.th}>CPU Time (ms)</th>
                                    <th className={styles.th}>Elapsed (ms)</th>
                                    <th className={styles.th}>Logical Reads</th>
                                    <th className={styles.th}>Reads</th>
                                    <th className={styles.th}>Writes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.activeRequests.map((row) => {
                                    const isBlocked =
                                      row.arStatus.trim().toLowerCase() ===
                                      "blocked";
                                    return (
                                      <tr
                                        key={`${group.dbName}-${row.arSessionId}`}
                                        className={`${styles.tr}${isBlocked ? ` ${styles.trBlocked}` : ""}`}
                                      >
                                        <td className={styles.tdNum}>
                                          {row.arSessionId}
                                        </td>
                                        <td className={styles.td}>
                                          {row.arCommand}
                                        </td>
                                        <td className={styles.td}>
                                          <span
                                            className={`${styles.requestStatusBadge} ${getRequestStatusClassName(row.arStatus)}`}
                                          >
                                            {row.arStatus}
                                          </span>
                                        </td>
                                        <td
                                          className={getNumericCellClass(
                                            row.arCpuTime,
                                            CPU_WARN_MS,
                                            CPU_DANGER_MS,
                                          )}
                                        >
                                          {row.arCpuTime.toLocaleString()}
                                        </td>
                                        <td
                                          className={getNumericCellClass(
                                            row.arTotalElapsedTime,
                                            ELAPSED_WARN_MS,
                                            ELAPSED_DANGER_MS,
                                          )}
                                        >
                                          {row.arTotalElapsedTime.toLocaleString()}
                                        </td>
                                        <td className={styles.tdNum}>
                                          {row.arLogicalReads.toLocaleString()}
                                        </td>
                                        <td className={styles.tdNum}>
                                          {row.arReads.toLocaleString()}
                                        </td>
                                        <td className={styles.tdNum}>
                                          {row.arWrites.toLocaleString()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className={styles.noActiveRequests}>
                              No active requests
                            </p>
                          )}

                          {group.blockStatuses.length > 0 && (
                            <>
                              <div className={styles.subSectionHeader}>
                                <h4 className={styles.subSectionTitle}>
                                  Block Status
                                </h4>
                              </div>
                              <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                  <thead>
                                    <tr>
                                      <th className={styles.th}>Session ID</th>
                                      <th className={styles.th}>
                                        Blocking Session ID
                                      </th>
                                      <th className={styles.th}>Command</th>
                                      <th className={styles.th}>Status</th>
                                      <th className={styles.th}>Wait Type</th>
                                      <th className={styles.th}>
                                        Wait Time (ms)
                                      </th>
                                      <th className={styles.th}>
                                        Wait Resource
                                      </th>
                                      <th className={styles.th}>SQL Text</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.blockStatuses.map((row) => {
                                      const waitTimeNum = parseInt(
                                        row.bsResWaitTime,
                                        10,
                                      );
                                      const waitTimeDisplay = Number.isNaN(
                                        waitTimeNum,
                                      )
                                        ? row.bsResWaitTime
                                        : waitTimeNum.toLocaleString();
                                      return (
                                        <tr
                                          key={`${group.dbName}-block-${row.bsResSessionId}-${row.bsResBlockingSessionId}`}
                                          className={styles.tr}
                                        >
                                          <td className={styles.tdNum}>
                                            {row.bsResSessionId}
                                          </td>
                                          <td className={styles.tdNum}>
                                            {row.bsResBlockingSessionId}
                                          </td>
                                          <td className={styles.td}>
                                            {row.bsResCommand}
                                          </td>
                                          <td className={styles.td}>
                                            <span
                                              className={`${styles.requestStatusBadge} ${getRequestStatusClassName(row.bsResStatus)}`}
                                            >
                                              {row.bsResStatus}
                                            </span>
                                          </td>
                                          <td className={styles.td}>
                                            {row.bsResWaitType}
                                          </td>
                                          <td className={styles.tdNum}>
                                            {waitTimeDisplay}
                                          </td>
                                          <td className={styles.td}>
                                            {row.bsResWaitResource}
                                          </td>
                                          <td className={styles.td}>
                                            {row.bsResSqlText}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}

                          {group.backups.length > 0 && (
                            <>
                              <div className={styles.subSectionHeader}>
                                <h4 className={styles.subSectionTitle}>
                                  Backup History
                                </h4>
                              </div>
                              <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                  <thead>
                                    <tr>
                                      <th className={styles.th}>Type</th>
                                      <th className={styles.th}>Started</th>
                                      <th className={styles.th}>Finished</th>
                                      <th className={styles.th}>User</th>
                                      <th className={styles.th}>Server</th>
                                      <th className={styles.th}>Device</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.backups.map((backup) => (
                                      <tr
                                        key={`${group.dbName}-${backup.bakBackupFinishDate}-${backup.bakPhysicalDeviceName}`}
                                        className={styles.tr}
                                      >
                                        <td className={styles.td}>
                                          {backup.bakBackupType}
                                        </td>
                                        <td className={styles.td}>
                                          {formatBackupDateTime(backup.bakBackupStartDate)}
                                        </td>
                                        <td className={styles.td}>
                                          {formatBackupDateTime(backup.bakBackupFinishDate)}
                                        </td>
                                        <td className={styles.td}>
                                          {backup.bakUserName}
                                        </td>
                                        <td className={styles.td}>
                                          {backup.bakServerName}
                                        </td>
                                        <td className={styles.tdPath}>
                                          {backup.bakPhysicalDeviceName}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </section>
            ))
          : null}

        {!isLoading && groupedData.length === 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td className={styles.tdEmpty}>
                    <span className={styles.noDataWarning}>
                      <IconAlert />
                      <span>No data</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Disconnect monitoring?"
      >
        <p className={styles.modalText}>
          Disconnecting will stop live monitoring updates until you reconnect.
        </p>
        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDisconnectModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDisconnectConfirm}
          >
            Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  );
}
