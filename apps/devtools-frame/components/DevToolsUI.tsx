"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  normalizeToolList,
  type NormalizedTool,
  FrameClient,
} from "@assistant-ui/react-devtools";
import {
  type EventLogEntry,
  eventScope,
  formatClockTime,
  isRecord,
  truncate,
} from "./common";
import { McpView } from "./mcp";
import { ModelContextView } from "./model-context";
import { RunTimeline } from "./runs";
import { ScopesView } from "./scopes";
import {
  ComposerAttachments,
  ComposerFlags,
  ComposerQueue,
  ThreadDetails,
  parseComposerPreview,
  parseThreadListItemPreview,
  parseThreadListPreview,
  parseThreadPreview,
} from "./thread";
import {
  CenteredMessage,
  Chip,
  ControlButton,
  EmptyState,
  JSONPreview,
  SectionLabel,
  SummaryItem,
} from "./ui";

interface AssistantState {
  [key: string]: unknown;
}

interface ModelContext {
  system?: string;
  tools?: NormalizedTool[];
  callSettings?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface ApiInfo {
  id: number;
  state: AssistantState;
  logs: EventLogEntry[];
  modelContext?: ModelContext;
  scopes?: unknown;
}

interface ApiData {
  apiId: number;
  state: any;
  events: any[];
  modelContext?: any;
  scopes?: any;
}

type TabType = "thread" | "context" | "activity" | "raw";

const TAB_LABELS: Record<TabType, string> = {
  thread: "Thread",
  context: "Context",
  activity: "Activity",
  raw: "Raw",
};

const THREAD_STATE_KEYS = new Set([
  "threads",
  "thread",
  "threadListItem",
  "threadlistitem",
  "composer",
]);

const parseEventTime = (value: unknown): Date => {
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return new Date();
};

const extractModelContext = (state: any): ModelContext | undefined => {
  if (!isRecord(state)) return undefined;

  const threadScope = state.thread;
  if (!isRecord(threadScope)) return undefined;

  const runtime = threadScope.runtime;
  if (!isRecord(runtime)) return undefined;

  const modelContext = runtime.modelContext;
  if (!isRecord(modelContext)) return undefined;

  const tools = normalizeToolList(modelContext.tools);

  return {
    ...(typeof modelContext.system === "string"
      ? { system: modelContext.system }
      : {}),
    ...(tools.length > 0 ? { tools } : {}),
    ...(isRecord(modelContext.callSettings)
      ? { callSettings: modelContext.callSettings }
      : {}),
    ...(isRecord(modelContext.config) ? { config: modelContext.config } : {}),
  };
};

const renderToolUIsStatePreview = (value: unknown) => {
  if (!isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-[11px]">
        no tool UI mappings
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([toolName, components]) => {
        const list = Array.isArray(components) ? components : [];
        const firstEntry = typeof list[0] === "string" ? list[0] : undefined;

        return (
          <div
            key={toolName}
            className="bg-muted/40 text-foreground rounded-md border p-3 text-[11px] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground font-medium">{toolName}</span>
              <Chip>
                {list.length} component{list.length === 1 ? "" : "s"}
              </Chip>
            </div>
            {firstEntry ? (
              <div className="text-muted-foreground mt-1 text-[10px]">
                First entry: {truncate(firstEntry, 80)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const renderThreadsStatePreview = (value: unknown) => {
  const state = parseThreadListPreview(value);
  if (!state) {
    return <JSONPreview value={value} />;
  }

  const activeCount = state.threadIds.length;
  const archivedCount = state.archivedThreadIds.length;
  const threadItems = state.threadItems.slice(0, 8);
  const main = state.main;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Main thread" value={state.mainThreadId ?? "—"} />
        <SummaryItem label="New thread" value={state.newThreadId ?? "—"} />
        <SummaryItem label="Active threads" value={String(activeCount)} />
        <SummaryItem label="Archived threads" value={String(archivedCount)} />
      </div>

      {threadItems.length ? (
        <div className="flex flex-col gap-2">
          <SectionLabel>Thread items ({state.threadItems.length})</SectionLabel>
          <div className="bg-card overflow-hidden rounded-lg border">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-muted text-muted-foreground text-[10px]">
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Identifiers</th>
                </tr>
              </thead>
              <tbody className="text-foreground text-[11px]">
                {threadItems.map((item) => (
                  <tr key={item.id} className="bg-card border-t">
                    <td className="px-3 py-2 align-top">
                      <div className="text-foreground font-medium">
                        {item.title || "(untitled)"}
                      </div>
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {item.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.status ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 align-top font-mono text-[10px]">
                      {item.remoteId ? `Remote: ${item.remoteId}` : null}
                      {item.remoteId && item.externalId ? <br /> : null}
                      {item.externalId ? `External: ${item.externalId}` : null}
                      {!item.remoteId && !item.externalId ? "—" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.threadItems.length > threadItems.length ? (
            <div className="text-muted-foreground text-[10px]">
              Showing first {threadItems.length} items
            </div>
          ) : null}
        </div>
      ) : null}

      {main ? (
        <ThreadDetails thread={main} title="Main thread overview" />
      ) : null}
    </div>
  );
};

const renderThreadStatePreview = (value: unknown) => {
  const thread = parseThreadPreview(value);
  if (!thread) {
    return <JSONPreview value={value} />;
  }
  return <ThreadDetails thread={thread} title="Thread overview" />;
};

const renderThreadListItemStatePreview = (value: unknown) => {
  const item = parseThreadListItemPreview(value);
  if (!item) {
    return <JSONPreview value={value} />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="ID" value={item.id} />
      <SummaryItem label="Title" value={item.title ?? "(untitled)"} />
      <SummaryItem label="Status" value={item.status ?? "—"} />
      <SummaryItem label="Remote ID" value={item.remoteId ?? "—"} />
      <SummaryItem label="External ID" value={item.externalId ?? "—"} />
    </div>
  );
};

const renderComposerStatePreview = (value: unknown) => {
  const composer = parseComposerPreview(value);
  if (!composer || !isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const text = typeof value.text === "string" ? value.text : "";
  const runConfig = value.runConfig;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Role" value={composer.role ?? "—"} />
        <SummaryItem label="Text length" value={String(composer.textLength)} />
        <SummaryItem
          label="Attachments"
          value={String(composer.attachments.length)}
        />
        <SummaryItem label="Mode" value={composer.type ?? "—"} />
      </div>
      <ComposerFlags composer={composer} />
      <ComposerAttachments attachments={composer.attachments} />
      {text ? (
        <div className="bg-card text-foreground flex flex-col gap-1 rounded-md border p-3 text-[11px]">
          <SectionLabel>Text preview</SectionLabel>
          <div className="text-foreground wrap-break-word whitespace-pre-wrap">
            {truncate(text, 240)}
          </div>
        </div>
      ) : null}
      {runConfig !== undefined ? (
        <div className="bg-card text-foreground flex flex-col gap-1 rounded-md border p-3 text-[11px]">
          <SectionLabel>Run config</SectionLabel>
          <JSONPreview value={runConfig} />
        </div>
      ) : null}
      <ComposerQueue queue={composer.queue} />
    </div>
  );
};

const renderStatePreview = (key: string, value: unknown) => {
  switch (key) {
    case "threads":
      return renderThreadsStatePreview(value);
    case "threadListItems":
      return renderThreadsStatePreview({
        threadItems: value,
        threadIds: [],
        archivedThreadIds: [],
      });
    case "thread":
      return renderThreadStatePreview(value);
    case "threadListItem":
    case "threadlistitem":
      return renderThreadListItemStatePreview(value);
    case "tools":
      return renderToolUIsStatePreview(value);
    case "composer":
      return renderComposerStatePreview(value);
    case "mcp":
      return <McpView value={value} />;
    default:
      return <JSONPreview value={value} />;
  }
};

export function DevToolsUI() {
  const [apis, setApis] = useState<ApiInfo[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("thread");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [unselectedEventTypes, setUnselectedEventTypes] = useState<Set<string>>(
    new Set(),
  );
  const knownEventTypesRef = useRef(new Set<string>());
  const frameClientRef = useRef<FrameClient | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }
    return document.hasFocus();
  });
  const isWindowFocusedRef = useRef(isWindowFocused);
  const selectedApiIdRef = useRef<number | null>(null);

  useEffect(() => {
    isWindowFocusedRef.current = isWindowFocused;
  }, [isWindowFocused]);

  useEffect(() => {
    selectedApiIdRef.current = selectedApiId;
  }, [selectedApiId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleFocus = () => {
      setIsWindowFocused(true);
    };
    const handleBlur = () => {
      setIsWindowFocused(false);
    };
    const handleVisibilityChange = () => {
      setIsWindowFocused(!document.hidden && document.hasFocus());
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    handleVisibilityChange();

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const client = new FrameClient();
    frameClientRef.current = client;

    const unsubscribe = client.subscribe((data) => {
      setSelectedApiId((id) => {
        const existingId = data.apis?.some((api) => api.apiId === id)
          ? id
          : null;
        return existingId ?? data.apis?.[0]?.apiId ?? null;
      });

      const convertedApis: ApiInfo[] =
        data.apis?.map((api: ApiData) => {
          const events = Array.isArray(api.events) ? api.events : [];
          return {
            id: api.apiId,
            state: api.state || {},
            logs: events.map((event: any) => ({
              time: parseEventTime(event.time),
              event: typeof event.event === "string" ? event.event : "unknown",
              data: event.data,
            })),
            modelContext: api.modelContext || extractModelContext(api.state),
            scopes: api.scopes,
          };
        }) ?? [];
      setApis(convertedApis);
    });

    const unsubscribeHostConnection = client.onHostConnected(() => {
      if (isWindowFocusedRef.current) {
        const currentSelectedApiId = selectedApiIdRef.current;
        client.setSubscription({
          apiList: true,
          apis: currentSelectedApiId !== null ? [currentSelectedApiId] : [],
        });
      } else {
        client.setSubscription({ apiList: true, apis: [] });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeHostConnection();
      client.setSubscription({ apiList: false, apis: [] });
      if (frameClientRef.current === client) {
        frameClientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const client = frameClientRef.current;
    if (!client) {
      return;
    }

    if (!isWindowFocused) {
      client.setSubscription({ apiList: true, apis: [] });
      return;
    }

    client.setSubscription({
      apiList: true,
      apis: selectedApiId !== null ? [selectedApiId] : [],
    });
  }, [isWindowFocused, selectedApiId]);

  const selectedApi = useMemo(
    () => apis.find((api) => api.id === selectedApiId) ?? apis[0] ?? null,
    [apis, selectedApiId],
  );

  useEffect(() => {
    const firstApi = apis[0];
    if (!selectedApi && firstApi) {
      setSelectedApiId(firstApi.id);
    }
  }, [apis, selectedApi]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    apis.forEach((api) => {
      api.logs.forEach((log) => types.add(log.event));
    });
    return Array.from(types).sort();
  }, [apis]);

  const eventTypesByScope = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const type of eventTypes) {
      const scope = eventScope(type);
      const existing = grouped.get(scope);
      if (existing) {
        existing.push(type);
      } else {
        grouped.set(scope, [type]);
      }
    }
    return Array.from(grouped.entries());
  }, [eventTypes]);

  useEffect(() => {
    setUnselectedEventTypes((prev) => {
      const eventTypeSet = new Set(eventTypes);
      const next = new Set(prev);
      let changed = false;

      Array.from(next).forEach((value) => {
        if (!eventTypeSet.has(value)) {
          next.delete(value);
          knownEventTypesRef.current.delete(value);
          changed = true;
        }
      });

      eventTypes.forEach((type) => {
        if (!knownEventTypesRef.current.has(type)) {
          knownEventTypesRef.current.add(type);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [eventTypes]);

  const filteredLogs = useMemo(() => {
    if (!selectedApi) return [];
    return selectedApi.logs.filter(
      (log) => !unselectedEventTypes.has(log.event),
    );
  }, [selectedApi, unselectedEventTypes]);

  const toggleStateSection = useCallback((key: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleEventType = useCallback((eventType: string) => {
    setUnselectedEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }, []);

  const toggleScope = useCallback((types: string[]) => {
    setUnselectedEventTypes((prev) => {
      const allSelected = types.every((type) => !prev.has(type));
      const next = new Set(prev);
      for (const type of types) {
        if (allSelected) {
          next.add(type);
        } else {
          next.delete(type);
        }
      }
      return next;
    });
  }, []);

  const clearEvents = useCallback(() => {
    if (frameClientRef.current && selectedApiId !== null) {
      frameClientRef.current.clearEvents(selectedApiId);
    }
  }, [selectedApiId]);

  const showApiSelector = apis.length > 1;

  const renderToolbar = () => {
    if (!showApiSelector) {
      return null;
    }

    return (
      <div className="bg-muted text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs">
        <span className="font-medium">API</span>
        <select
          value={selectedApiId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSelectedApiId(Number.isNaN(value) ? null : value);
          }}
          className="bg-card text-foreground rounded-md border px-2 py-1 text-xs"
        >
          {apis.map((api) => (
            <option key={api.id} value={api.id}>
              API #{api.id}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderTabControls = () => {
    if (activeTab === "activity") {
      return (
        <div className="flex h-full items-center gap-2 px-2">
          <ControlButton onClick={clearEvents}>Clear events</ControlButton>
        </div>
      );
    }
    return null;
  };

  const renderThreadContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    const entries = Object.entries(selectedApi.state).filter(([key]) =>
      THREAD_STATE_KEYS.has(key),
    );
    if (entries.length === 0) {
      return (
        <EmptyState>No thread state for this assistant instance.</EmptyState>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {entries.map(([key, value]) => (
          <div key={key}>{renderStatePreview(key, value)}</div>
        ))}
      </div>
    );
  };

  const renderContextContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    const mcp = selectedApi.state.mcp;
    const toolUIs = selectedApi.state.tools;

    return (
      <div className="flex flex-col gap-4">
        <ModelContextView modelContext={selectedApi.modelContext} />
        {mcp !== undefined ? <McpView value={mcp} /> : null}
        {toolUIs !== undefined ? renderToolUIsStatePreview(toolUIs) : null}
      </div>
    );
  };

  const renderActivityContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <RunTimeline logs={selectedApi.logs} />

        <div className="flex flex-col gap-3">
          <SectionLabel>Event log</SectionLabel>
          {eventTypesByScope.length > 0 && (
            <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
              {eventTypesByScope.map(([scope, types]) => {
                const allSelected = types.every(
                  (type) => !unselectedEventTypes.has(type),
                );
                return (
                  <div
                    key={scope}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleScope(types)}
                      className={clsx(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        allSelected
                          ? "bg-accent text-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {scope}
                    </button>
                    {types.map((eventType) => (
                      <label
                        key={eventType}
                        title={eventType}
                        className={clsx(
                          "flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          !unselectedEventTypes.has(eventType)
                            ? "border-foreground/40 bg-accent text-foreground"
                            : "bg-card text-muted-foreground",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!unselectedEventTypes.has(eventType)}
                          onChange={() => toggleEventType(eventType)}
                          className="accent-foreground size-3 rounded"
                        />
                        <span>
                          {eventType.slice(scope.length + 1) || eventType}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {filteredLogs.length === 0 ? (
            <EmptyState>
              {eventTypes.length === 0
                ? "No events logged for this assistant instance."
                : "No events match the current filters."}
            </EmptyState>
          ) : (
            <div className="bg-card overflow-hidden rounded-lg border">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-muted text-muted-foreground text-[11px]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Scope</th>
                    <th className="px-4 py-2 font-medium">Event</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={`${log.event}-${index}`}
                      className="border-t text-[11px]"
                    >
                      <td className="text-muted-foreground px-4 py-2 align-top font-mono whitespace-nowrap">
                        {formatClockTime(log.time)}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 align-top">
                        {eventScope(log.event)}
                      </td>
                      <td className="text-foreground px-4 py-2 align-top font-medium">
                        {log.event}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <JSONPreview value={log.data} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRawContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    const stateEntries = Object.entries(selectedApi.state);

    return (
      <div className="flex flex-col gap-3">
        {stateEntries.map(([key, value]) => {
          const expanded = expandedStates.has(key);
          return (
            <div
              key={key}
              className="bg-card overflow-hidden rounded-lg border transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleStateSection(key)}
                className="bg-muted text-foreground hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors"
              >
                <span>{key}</span>
                <span
                  className={clsx(
                    "text-muted-foreground transition-transform",
                    expanded && "rotate-90",
                  )}
                >
                  ›
                </span>
              </button>
              {expanded && (
                <div className="border-t p-4">
                  <pre className="bg-muted text-foreground overflow-auto rounded-lg p-3 font-mono text-[11px] whitespace-pre">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
        <ScopesView scopes={selectedApi.scopes} />
      </div>
    );
  };

  const renderTabContent = (): ReactNode => {
    switch (activeTab) {
      case "thread":
        return renderThreadContent();
      case "context":
        return renderContextContent();
      case "activity":
        return renderActivityContent();
      default:
        return renderRawContent();
    }
  };

  return (
    <div className="h-full w-full">
      <div className="bg-background text-foreground flex h-full flex-col text-xs">
        {renderToolbar()}

        <nav className="bg-muted flex h-10 items-center justify-between border-b px-2">
          <div className="flex h-full items-center gap-1">
            {(["thread", "context", "activity", "raw"] as TabType[]).map(
              (tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex h-full items-center px-2.5 text-xs font-medium transition-colors",
                    activeTab === tab
                      ? "border-foreground text-foreground border-b-2"
                      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
                  )}
                >
                  {TAB_LABELS[tab]}
                </button>
              ),
            )}
          </div>
          {renderTabControls()}
        </nav>

        <section className="bg-background flex-1 overflow-auto p-4">
          {renderTabContent()}
        </section>

        <footer className="bg-muted text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-[11px]">
          <span>
            {apis.length > 0
              ? `${apis.length} assistant instance${apis.length > 1 ? "s" : ""} detected`
              : "Waiting for instances"}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </footer>
      </div>
    </div>
  );
}
