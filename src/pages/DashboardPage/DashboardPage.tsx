import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  useSqlServerDashboard,
  useSqlServerConnections,
} from "@/features/dashboard/hooks/useDashboard";
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

type DashboardTab = "databases" | "connections" | "websocket";

const TAB_ORDER: DashboardTab[] = ["databases", "websocket", "connections"];

export function DashboardPage() {
  const {
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
  } = useSqlServerDashboard();
  const { data: connectionsData } = useSqlServerConnections();
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("databases");
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

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
      };
      group.blockStatuses.push(bs);
      groups.set(dbName, group);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: group.rows,
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
  }, [activeRequests, blockStatuses, data, dbStatuses, sessions]);

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
        <h2 className={styles.title}>SQL Server</h2>
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
            Last updated: {lastUpdated}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={styles.actionButton}
            onClick={() => reconnect()}
            aria-label="Reconnect WebSocket"
          >
            <IconRefresh />
            <span>Reconnect</span>
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsDisconnectModalOpen(true)}
            aria-label="Disconnect WebSocket"
            disabled={status === "disconnected"}
          >
            <span>Disconnect</span>
          </Button>
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
          id="dashboard-tab-websocket"
          role="tab"
          aria-selected={activeTab === "websocket"}
          aria-controls="dashboard-panel-overall-performance"
          tabIndex={activeTab === "websocket" ? 0 : -1}
          className={`${styles.tab} ${activeTab === "websocket" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("websocket")}
          onKeyDown={(event) => handleTabKeyDown(event, "websocket")}
        >
          Overall Performance
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
          WebSocket
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
        aria-labelledby="dashboard-tab-websocket"
        tabIndex={0}
        hidden={activeTab !== "websocket"}
      >
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
                      >
                        <span
                          className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ""}`}
                        >
                          ▼
                        </span>
                        <h3 className={styles.dbTitle}>{group.dbName}</h3>
                        <span
                          className={`${styles.dbMetaInline} ${group.dbStatus ? (isOnline ? styles.stateOnline : styles.stateOffline) : styles.dbMeta}`}
                        >
                          Sessions: {group.sessionCount.toLocaleString()}
                          {group.dbStatus && (
                            <>
                              {" "}
                              | State: {group.dbStatus.state} | Access:{" "}
                              {group.dbStatus.access} | Recovery:{" "}
                              {group.dbStatus.recoveryModel}
                            </>
                          )}
                        </span>
                      </button>

                      {!collapsed && (
                        <>
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
