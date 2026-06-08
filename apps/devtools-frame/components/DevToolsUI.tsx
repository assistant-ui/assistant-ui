"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  normalizeToolList,
  type NormalizedTool,
  FrameClient,
} from "@assistant-ui/react-devtools";
import { eventScope, formatClockTime, isRecord, truncate } from "./common";
import { McpView } from "./mcp";
import { ModelContextView } from "./model-context";
import { RunTimeline } from "./runs";
import {
  ThreadDetails,
  parseComposerPreview,
  parseThreadListItemPreview,
  parseThreadListPreview,
  parseThreadPreview,
} from "./thread";
import { CenteredMessage, ControlButton, JSONPreview, SummaryItem } from "./ui";

interface AssistantState {
  [key: string]: unknown;
}

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
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
  logs: EventLog[];
  modelContext?: ModelContext;
}

interface ApiData {
  apiId: number;
  state: any;
  events: any[];
  modelContext?: any;
}

type TabType = "state" | "events" | "modelContext" | "runs";

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
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
        &lt;no tool UI mappings&gt;
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
            className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                {toolName}
              </span>
              <span className="text-[10px] tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {list.length} component{list.length === 1 ? "" : "s"}
              </span>
            </div>
            {firstEntry ? (
              <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
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
        <SummaryItem label="Main Thread" value={state.mainThreadId ?? "—"} />
        <SummaryItem label="New Thread" value={state.newThreadId ?? "—"} />
        <SummaryItem label="Active Threads" value={String(activeCount)} />
        <SummaryItem label="Archived Threads" value={String(archivedCount)} />
      </div>

      {threadItems.length ? (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Thread Items ({state.threadItems.length})
          </div>
          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-zinc-100 text-[10px] tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Identifiers</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-zinc-700 dark:text-zinc-200">
                {threadItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-zinc-800 dark:text-zinc-100">
                        {item.title || "(untitled)"}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        ID: {item.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.status ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-[10px] text-zinc-500 dark:text-zinc-400">
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
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Showing first {threadItems.length} items
            </div>
          ) : null}
        </div>
      ) : null}

      {main ? (
        <ThreadDetails thread={main} title="Main Thread Overview" />
      ) : null}
    </div>
  );
};

const renderThreadStatePreview = (value: unknown) => {
  const thread = parseThreadPreview(value);
  if (!thread) {
    return <JSONPreview value={value} />;
  }
  return <ThreadDetails thread={thread} title="Thread Overview" />;
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
        <SummaryItem label="Text Length" value={String(composer.textLength)} />
        <SummaryItem label="Attachments" value={String(composer.attachments)} />
        <SummaryItem label="Mode" value={composer.type ?? "—"} />
      </div>
      {text ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Text Preview
          </div>
          <div className="mt-1 wrap-break-word whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
            {truncate(text, 240)}
          </div>
        </div>
      ) : null}
      {runConfig !== undefined ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Run Config
          </div>
          <JSONPreview value={runConfig} />
        </div>
      ) : null}
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
  const [activeTab, setActiveTab] = useState<TabType>("state");
  const [viewMode, setViewMode] = useState<"raw" | "preview">("preview");
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
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-900 dark:bg-zinc-950">
        <span className="font-medium">API</span>
        <select
          value={selectedApiId ?? ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSelectedApiId(Number.isNaN(value) ? null : value);
          }}
          className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
    switch (activeTab) {
      case "events":
        return (
          <div className="flex h-full items-center gap-2 px-2">
            <ControlButton onClick={clearEvents}>Clear Events</ControlButton>
          </div>
        );
      case "state":
        return (
          <div className="flex h-full items-center gap-2 px-2">
            <ControlButton
              onClick={() =>
                setViewMode((prev) => (prev === "preview" ? "raw" : "preview"))
              }
            >
              View: {viewMode === "preview" ? "Preview" : "Raw"}
            </ControlButton>
          </div>
        );
      case "runs":
        return (
          <div className="flex h-full items-center px-4 text-xs text-zinc-500 dark:text-zinc-400">
            Run timeline
          </div>
        );
      default:
        return (
          <div className="flex h-full items-center px-4 text-xs text-zinc-500 dark:text-zinc-400">
            Model context overview
          </div>
        );
    }
  };

  const renderStateContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    if (Object.keys(selectedApi.state).length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No state detected for this assistant instance.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {Object.entries(selectedApi.state).map(([key, value]) => {
          const expanded = expandedStates.has(key);
          return (
            <div
              key={key}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => toggleStateSection(key)}
                className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>{key}</span>
                <span className="text-lg">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && (
                <div className="border-t border-zinc-200 p-4 text-[11px] transition-colors dark:border-zinc-800">
                  {viewMode === "preview" ? (
                    renderStatePreview(key, value)
                  ) : (
                    <pre className="overflow-auto rounded-lg bg-zinc-100 p-3 text-[11px] whitespace-pre text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEventsContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {eventTypesByScope.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            {eventTypesByScope.map(([scope, types]) => {
              const allSelected = types.every(
                (type) => !unselectedEventTypes.has(type),
              );
              return (
                <div key={scope} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleScope(types)}
                    className={clsx(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors",
                      allSelected
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
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
                          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200"
                          : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!unselectedEventTypes.has(eventType)}
                        onChange={() => toggleEventType(eventType)}
                        className="size-3 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
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
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {eventTypes.length === 0
                ? "No events logged for this assistant instance."
                : "No events match the current filters."}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-zinc-100 text-[11px] tracking-wide text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-2 font-semibold">Time</th>
                  <th className="px-4 py-2 font-semibold">Scope</th>
                  <th className="px-4 py-2 font-semibold">Event</th>
                  <th className="px-4 py-2 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={`${log.event}-${index}`}
                    className="border-t border-zinc-200 bg-white text-[11px] transition-colors dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <td className="px-4 py-2 align-top font-mono whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                      {formatClockTime(log.time)}
                    </td>
                    <td className="px-4 py-2 align-top text-zinc-500 dark:text-zinc-400">
                      {eventScope(log.event)}
                    </td>
                    <td className="px-4 py-2 align-top font-semibold text-zinc-800 dark:text-zinc-100">
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
    );
  };

  const renderContextContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    return <ModelContextView modelContext={selectedApi.modelContext} />;
  };

  const renderRunsContent = () => {
    if (!selectedApi) {
      return (
        <CenteredMessage>Waiting for assistant-ui instance...</CenteredMessage>
      );
    }

    return <RunTimeline logs={selectedApi.logs} />;
  };

  const renderTabContent = (): ReactNode => {
    switch (activeTab) {
      case "state":
        return renderStateContent();
      case "events":
        return renderEventsContent();
      case "runs":
        return renderRunsContent();
      default:
        return renderContextContent();
    }
  };

  return (
    <div className="dark h-full w-full" data-theme="dark">
      <div className="flex h-full flex-col bg-white font-mono text-xs text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
        {renderToolbar()}

        <nav className="flex h-10 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-900 dark:bg-zinc-950">
          <div className="flex h-full items-center gap-1">
            {["state", "modelContext", "events", "runs"].map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={clsx(
                  "flex h-full items-center px-2.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-blue-500 text-zinc-900 dark:border-blue-400 dark:text-zinc-100"
                    : "border-b-2 border-transparent hover:text-zinc-700 dark:hover:text-zinc-200",
                )}
              >
                {tab === "modelContext" ? "Model Context" : tab}
              </button>
            ))}
          </div>
          {renderTabControls()}
        </nav>

        <section className="flex-1 overflow-auto bg-white p-4 transition-colors dark:bg-zinc-950">
          {renderTabContent()}
        </section>

        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] text-zinc-500 transition-colors dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-500">
          <span>
            Status:{" "}
            {apis.length > 0
              ? `${apis.length} assistant instance${apis.length > 1 ? "s" : ""} detected`
              : "Waiting for instances"}
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Connected
          </span>
        </footer>
      </div>
    </div>
  );
}
