"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { DevToolsHooks, EventLog } from "./DevToolsHooks";
import { AssistantApi } from "../context/react/AssistantApiContext";
import { AssistantApiProvider } from "../context/react/AssistantApiContext";

const isDarkMode = () => {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark")
  );
};

const devToolsStringify = (obj: any, space?: number): string => {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (value !== null && typeof value === "object") {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }

      if (typeof value === "function") return "[Function]";
      if (typeof value === "symbol") return `[Symbol: ${value.toString()}]`;
      if (value instanceof Error) return `[Error: ${value.message}]`;
      if (value instanceof Date) return `[Date: ${value.toISOString()}]`;
      if (value instanceof RegExp) return `[RegExp: ${value.toString()}]`;
      if (value instanceof Map) return `[Map(${value.size})]`;
      if (value instanceof Set) return `[Set(${value.size})]`;
      if (value instanceof WeakMap) return "[WeakMap]";
      if (value instanceof WeakSet) return "[WeakSet]";
      if (value instanceof Promise) return "[Promise]";
      if (typeof value === "undefined") return "[undefined]";

      return value;
    },
    space
  );
};

interface DevToolsUIProps {
  darkModeProp?: boolean;
}

export const DevToolsUI = ({ darkModeProp }: DevToolsUIProps = {}) => {
  const [apis, setApis] = useState<Array<[number, Partial<AssistantApi>]>>([]);
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [localDarkMode, setLocalDarkMode] = useState(isDarkMode());

  const darkMode = darkModeProp ?? localDarkMode;

  useEffect(() => {
    // Only set up observer if we're not using the prop
    if (darkModeProp !== undefined) return;

    const checkDarkMode = () => setLocalDarkMode(isDarkMode());

    // Check for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    if (document.body !== document.documentElement) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, [darkModeProp]);

  useEffect(() => {
    const devTools = DevToolsHooks.getInstance();

    // Get initial APIs
    const initialApis = devTools.getApis();
    setApis(initialApis);

    // Set initial selected API if available
    if (initialApis.length > 0 && selectedApiId === null) {
      const firstApi = initialApis[0];
      if (firstApi) {
        setSelectedApiId(firstApi[0]);
      }
    }

    // Subscribe to API changes
    const unsubscribe = devTools.subscribe(() => {
      const currentApis = devTools.getApis();
      setApis(currentApis);

      // If selected API was removed, select the first available
      if (selectedApiId !== null && !currentApis.some(([id]) => id === selectedApiId)) {
        const firstApi = currentApis[0];
        setSelectedApiId(firstApi ? firstApi[0] : null);
      }
    });

    return unsubscribe;
  }, [selectedApiId]);

  // Subscribe to event logs from DevToolsHooks
  useEffect(() => {
    if (selectedApiId === null) {
      setEventLogs([]);
      return;
    }

    const devTools = DevToolsHooks.getInstance();
    const unsubscribe = devTools.subscribeToEvents(selectedApiId, (logs) => {
      setEventLogs(logs);
    });

    return unsubscribe;
  }, [selectedApiId]);

  const clearLogs = useCallback(() => {
    if (selectedApiId === null) return;
    const devTools = DevToolsHooks.getInstance();
    devTools.clearEventLogs(selectedApiId);
  }, [selectedApiId]);

  const selectedApi = selectedApiId !== null
    ? DevToolsHooks.getInstance().getApi(selectedApiId)
    : undefined;

  const styles = useMemo(() => getStyles(darkMode), [darkMode]);

  if (apis.length === 0) {
    return (
      <div style={{ ...styles.container, ...styles.empty }}>
        <h2>Assistant UI DevTools</h2>
        <p>
          No Assistant UI instances detected. Make sure your application is
          using AssistantProvider.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* API Selector */}
      <div style={styles.header}>
        <label>
          Select Assistant Instance:
          <select
            value={selectedApiId || ""}
            onChange={(e) => setSelectedApiId(Number(e.target.value))}
            style={styles.select}
          >
            {apis.map(([id], index) => (
              <option key={id} value={id}>
                Instance {index + 1} (ID: {id})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={styles.content}>
        {/* State Viewer */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Assistant State</h3>
          {selectedApi && (
            <AssistantApiProvider api={selectedApi} devToolsVisible={false}>
              <StateViewer api={selectedApi} darkMode={darkMode} />
            </AssistantApiProvider>
          )}
        </div>

        {/* Event Logs */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Event Logs</h3>
            <button onClick={clearLogs} style={styles.button}>
              Clear
            </button>
          </div>
          <div style={styles.logs}>
            {eventLogs.length === 0 ? (
              <p style={styles.logsEmpty}>No events logged yet...</p>
            ) : (
              [...eventLogs].reverse().map((log, index) => (
                <div key={`${log.time.getTime()}-${index}`} style={styles.logEntry}>
                  <div style={styles.logHeader}>
                    [{log.time.toLocaleTimeString()}] {log.event}
                  </div>
                  <pre style={styles.logData}>
                    {devToolsStringify(log.data, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StateViewerProps {
  api: Partial<AssistantApi>;
  darkMode: boolean;
}

const StateViewer = memo<StateViewerProps>(({ api, darkMode }) => {
    const [state, setState] = useState<any>({});
    const [viewMode, setViewMode] = useState<"raw" | "preview">("preview");

    const updateState = useCallback(() => {
      const newState: any = {};
      for (const [name, scope] of Object.entries(api)) {
        if ((scope as any).source === "root") {
          try {
            newState[name] = (scope as () => any)().getState();
          } catch (e) {
            newState[name] = { error: String(e) };
          }
        }
      }

      setState(newState);
    }, [api]);

    useEffect(() => {
      // Initial state
      updateState();

      // Subscribe to changes
      if (api.subscribe) {
        const unsubscribe = api.subscribe(updateState);
        return unsubscribe;
      }
      return undefined;
    }, [api, updateState]);

    const styles = useMemo(() => getStyles(darkMode), [darkMode]);

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={styles.viewModeToggle}>
          <button
            style={{
              ...styles.viewModeButton,
              ...(viewMode === "preview" ? styles.viewModeButtonActive : {})
            }}
            onClick={() => setViewMode("preview")}
          >
            Preview
          </button>
          <button
            style={{
              ...styles.viewModeButton,
              ...(viewMode === "raw" ? styles.viewModeButtonActive : {})
            }}
            onClick={() => setViewMode("raw")}
          >
            Raw
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {viewMode === "raw" ? (
            <pre style={styles.stateViewer}>{devToolsStringify(state, 2)}</pre>
          ) : (
            <StatePreview state={state} darkMode={darkMode} />
          )}
        </div>
      </div>
    );
});

StateViewer.displayName = "StateViewer";

// Preview component for hierarchical state view
const StatePreview = ({ state, darkMode }: { state: any; darkMode: boolean }) => {
  const styles = useMemo(() => getPreviewStyles(darkMode), [darkMode]);

  const renderStateBox = (title: string, data: any, indent = 0) => {
    if (!data) return null;

    // Extract key fields to show at the top level
    const keyFields: Record<string, string[]> = {
      threads: ["mainThreadId", "threadIds", "isLoading"],
      threadlist: ["mainThreadId", "threadIds", "isLoading"],
      thread: ["isRunning", "isLoading", "messages"],
      composer: ["text", "attachments"],
    };

    // Fields to exclude from state box (shown elsewhere)
    const excludeFromState: Record<string, string[]> = {
      threads: ["mainThreadId", "threadIds", "isLoading", "main", "threadItems", "archivedThreadIds", "newThreadId"],
      threadlist: ["mainThreadId", "threadIds", "isLoading", "main", "threadItems", "archivedThreadIds", "newThreadId"],
      thread: ["isRunning", "isLoading", "messages", "composer"],
      composer: ["text", "attachments"],
    };

    const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
    const fields = keyFields[titleKey] || [];
    const excludeFields = excludeFromState[titleKey] || [];

    const extractedFields: any = {};
    const remainingState: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (fields.includes(key)) {
        extractedFields[key] = value;
      } else if (!excludeFields.includes(key)) {
        remainingState[key] = value;
      }
    });

    return (
      <div style={{ ...styles.box, marginLeft: `${indent * 20}px` }}>
        <div style={styles.boxHeader}>{title}</div>

        {/* Key fields */}
        {Object.entries(extractedFields).map(([key, value]) => (
          <div key={key} style={styles.keyField}>
            <span style={styles.fieldName}>{key}:</span>
            <span style={styles.fieldValue}>
              {typeof value === "object" && value !== null
                ? Array.isArray(value)
                  ? `[${value.length} items]`
                  : "{...}"
                : String(value)}
            </span>
          </div>
        ))}

        {/* State box */}
        {Object.keys(remainingState).length > 0 && (
          <details style={styles.details}>
            <summary style={styles.summary}>state</summary>
            <pre style={styles.stateContent}>
              {devToolsStringify(remainingState, 2)}
            </pre>
          </details>
        )}

        {/* Nested structures */}
        {title === "ThreadList" && data.threadItems && (
          <details style={styles.details}>
            <summary style={styles.summary}>
              items [{data.threadItems.length}]
            </summary>
            <div style={styles.itemsList}>
              {data.threadItems.map((item: any, idx: number) => (
                <div key={idx} style={styles.item}>
                  <span style={styles.itemTitle}>
                    {item.title || item.id || `Item ${idx + 1}`}
                  </span>
                  <span style={styles.itemStatus}>
                    {item.status || "active"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Archived threads */}
        {title === "ThreadList" && data.archivedThreadIds && data.archivedThreadIds.length > 0 && (
          <details style={styles.details}>
            <summary style={styles.summary}>
              archived [{data.archivedThreadIds.length}]
            </summary>
            <div style={styles.itemsList}>
              {data.archivedThreadIds.map((id: string, idx: number) => (
                <div key={idx} style={styles.item}>
                  <span style={styles.itemTitle}>{id}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Main thread */}
        {title === "ThreadList" && data.main && (
          <div style={styles.nestedBox}>
            {renderStateBox("Thread (main)", data.main, indent + 1)}
          </div>
        )}

        {/* Messages */}
        {title.includes("Thread") && data.messages && (
          <details style={styles.details}>
            <summary style={styles.summary}>
              messages [{data.messages.length}]
            </summary>
            <div style={styles.itemsList}>
              {data.messages.slice(0, 10).map((msg: any, idx: number) => (
                <div key={idx} style={styles.messageItem}>
                  <div style={styles.messageHeader}>
                    <span style={styles.messageRole}>{msg.role}</span>
                    <span style={styles.messageContent}>
                      {msg.content?.[0]?.text?.slice(0, 50) || "..."}
                    </span>
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={styles.messageAttachments}>
                      <span style={styles.attachmentIndicator}>📎</span>
                      <span style={styles.attachmentCount}>
                        {msg.attachments.length} attachment{msg.attachments.length > 1 ? 's' : ''}
                      </span>
                      <span style={styles.attachmentNames}>
                        ({msg.attachments.map((att: any) => att.name || att.id).join(', ')})
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {data.messages.length > 10 && (
                <div style={styles.moreItems}>
                  ... and {data.messages.length - 10} more
                </div>
              )}
            </div>
          </details>
        )}

        {/* Composer */}
        {title.includes("Thread") && data.composer && (
          <div style={styles.nestedBox}>
            {renderStateBox("Composer", data.composer, indent + 1)}
          </div>
        )}

        {/* Attachments */}
        {title === "Composer" && data.attachments && (
          <details style={styles.details}>
            <summary style={styles.summary}>
              attachments [{data.attachments.length}]
            </summary>
            <div style={styles.itemsList}>
              {data.attachments.map((att: any, idx: number) => (
                <div key={idx} style={styles.item}>
                  <span>{att.name || att.id}</span>
                  <span style={styles.attachmentType}>{att.type}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {state.threads && renderStateBox("ThreadList", state.threads)}
      {!state.threads && state.thread && renderStateBox("Thread", state.thread)}
      {Object.keys(state).length === 0 && (
        <div style={styles.emptyState}>No state available</div>
      )}
    </div>
  );
};

const getPreviewStyles = (darkMode: boolean) => ({
  container: {
    padding: "10px",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: "12px",
  },
  box: {
    border: `1px solid ${darkMode ? "#404040" : "#d4d4d4"}`,
    borderRadius: "6px",
    marginBottom: "10px",
    background: darkMode ? "#171717" : "#fafafa",
  },
  boxHeader: {
    padding: "8px 12px",
    background: darkMode ? "#262626" : "#f0f0f0",
    borderBottom: `1px solid ${darkMode ? "#404040" : "#d4d4d4"}`,
    fontWeight: 600,
    color: darkMode ? "#e5e5e5" : "#1a1a1a",
    borderRadius: "6px 6px 0 0",
  },
  keyField: {
    padding: "6px 12px",
    display: "flex",
    gap: "8px",
    borderBottom: `1px solid ${darkMode ? "#333" : "#e5e5e5"}`,
  },
  fieldName: {
    color: darkMode ? "#94a3b8" : "#64748b",
    minWidth: "120px",
  },
  fieldValue: {
    color: darkMode ? "#10b981" : "#059669",
    fontWeight: 500,
  },
  details: {
    margin: "8px",
  },
  summary: {
    cursor: "pointer",
    padding: "4px 8px",
    background: darkMode ? "#1a1a1a" : "#f9f9f9",
    borderRadius: "4px",
    color: darkMode ? "#a3a3a3" : "#525252",
    fontSize: "11px",
    fontWeight: 500,
  },
  stateContent: {
    margin: "8px 0",
    padding: "8px",
    background: darkMode ? "#0a0a0a" : "white",
    border: `1px solid ${darkMode ? "#333" : "#e5e5e5"}`,
    borderRadius: "4px",
    fontSize: "11px",
    overflow: "auto",
    maxHeight: "200px",
    color: darkMode ? "#a3a3a3" : "#525252",
  },
  nestedBox: {
    padding: "8px",
    borderTop: `1px solid ${darkMode ? "#333" : "#e5e5e5"}`,
  },
  itemsList: {
    margin: "8px 0",
    padding: "4px",
    background: darkMode ? "#0a0a0a" : "white",
    border: `1px solid ${darkMode ? "#333" : "#e5e5e5"}`,
    borderRadius: "4px",
  },
  item: {
    padding: "4px 8px",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: `1px solid ${darkMode ? "#262626" : "#f0f0f0"}`,
    fontSize: "11px",
  },
  itemTitle: {
    color: darkMode ? "#e5e5e5" : "#1a1a1a",
  },
  itemStatus: {
    color: darkMode ? "#94a3b8" : "#64748b",
    fontSize: "10px",
  },
  messageRole: {
    color: darkMode ? "#60a5fa" : "#2563eb",
    fontWeight: 500,
    minWidth: "60px",
  },
  messageContent: {
    color: darkMode ? "#a3a3a3" : "#525252",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  messageItem: {
    padding: "6px 8px",
    background: darkMode ? "#0a0a0a" : "white",
    borderRadius: "4px",
    marginBottom: "4px",
    border: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
  },
  messageHeader: {
    display: "flex",
    gap: "8px",
  },
  messageAttachments: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "4px",
    paddingLeft: "4px",
    fontSize: "11px",
    color: darkMode ? "#737373" : "#737373",
  },
  attachmentIndicator: {
    fontSize: "12px",
  },
  attachmentCount: {
    fontWeight: 500,
    color: darkMode ? "#94a3b8" : "#64748b",
  },
  attachmentNames: {
    color: darkMode ? "#737373" : "#a3a3a3",
    fontStyle: "italic",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
  attachmentType: {
    color: darkMode ? "#fbbf24" : "#f59e0b",
    fontSize: "10px",
  },
  moreItems: {
    padding: "4px 8px",
    color: darkMode ? "#737373" : "#a3a3a3",
    fontStyle: "italic",
    fontSize: "10px",
  },
  emptyState: {
    padding: "20px",
    textAlign: "center" as const,
    color: darkMode ? "#737373" : "#a3a3a3",
  },
});

const getStyles = (darkMode: boolean) => ({
  container: {
    display: "flex" as const,
    flexDirection: "column" as const,
    height: "100%",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: "12px",
    background: darkMode ? "#0a0a0a" : "white",
    color: darkMode ? "#e5e5e5" : "#1a1a1a",
  },
  empty: {
    padding: "20px",
  },
  header: {
    padding: "10px",
    borderBottom: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    background: darkMode ? "#171717" : "#f9f9f9",
  },
  select: {
    marginLeft: "10px",
    padding: "4px 8px",
    background: darkMode ? "#262626" : "white",
    border: `1px solid ${darkMode ? "#404040" : "#d4d4d4"}`,
    borderRadius: "4px",
    color: "inherit",
  },
  content: {
    display: "flex" as const,
    flex: 1,
    overflow: "hidden" as const,
  },
  panel: {
    flex: 1,
    padding: "10px",
    overflow: "auto" as const,
    display: "flex" as const,
    flexDirection: "column" as const,
    borderRight: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    background: darkMode ? "#0a0a0a" : "white",
  },
  panelTitle: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    fontWeight: 600 as const,
    color: darkMode ? "#e5e5e5" : "#1a1a1a",
  },
  panelHeader: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: "10px",
  },
  button: {
    padding: "5px 10px",
    background: darkMode ? "#262626" : "#f3f3f3",
    border: `1px solid ${darkMode ? "#404040" : "#d4d4d4"}`,
    borderRadius: "4px",
    cursor: "pointer" as const,
    color: "inherit",
    fontSize: "11px",
  },
  logs: {
    flex: 1,
    overflow: "auto" as const,
    background: darkMode ? "#171717" : "#fafafa",
    padding: "10px",
    border: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    borderRadius: "4px",
  },
  logsEmpty: {
    color: "#737373",
  },
  logEntry: {
    marginBottom: "10px",
    padding: "8px",
    background: darkMode ? "#0a0a0a" : "white",
    border: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    borderRadius: "4px",
  },
  logHeader: {
    fontWeight: 600 as const,
    color: darkMode ? "#a3a3a3" : "#404040",
    marginBottom: "4px",
  },
  logData: {
    margin: 0,
    fontSize: "11px",
    color: darkMode ? "#a3a3a3" : "#737373",
    maxHeight: "100px",
    overflow: "auto" as const,
    whiteSpace: "pre" as const,
  },
  stateViewer: {
    background: darkMode ? "#171717" : "#fafafa",
    padding: "10px",
    border: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    borderRadius: "4px",
    overflow: "auto" as const,
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.4,
    color: darkMode ? "#a3a3a3" : "#404040",
  },
  viewModeToggle: {
    display: "flex" as const,
    gap: "4px",
    padding: "8px",
    borderBottom: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    background: darkMode ? "#0a0a0a" : "#fafafa",
  },
  viewModeButton: {
    padding: "4px 12px",
    background: "transparent",
    border: `1px solid ${darkMode ? "#404040" : "#d4d4d4"}`,
    borderRadius: "4px",
    color: darkMode ? "#a3a3a3" : "#525252",
    fontSize: "11px",
    cursor: "pointer" as const,
    transition: "all 0.2s",
  },
  viewModeButtonActive: {
    background: darkMode ? "#262626" : "white",
    borderColor: darkMode ? "#10b981" : "#059669",
    color: darkMode ? "#10b981" : "#059669",
    fontWeight: 600,
  },
});
