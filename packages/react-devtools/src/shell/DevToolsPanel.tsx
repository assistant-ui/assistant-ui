"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useDevToolsClient } from "../data/useDevToolsClient";
import { inProcessClient } from "../data/createInProcessClient";
import type { DevToolsClient } from "../data/types";
import { CenteredMessage } from "../views/ui";
import {
  builtinPlugins,
  type DevToolsPanelPlugin,
  type DevToolsTabContext,
} from "./registry";

export interface DevToolsPanelProps {
  /** Additional inspector tabs appended after the builtins. */
  plugins?: DevToolsPanelPlugin[] | undefined;
  /** Resolved theme, used to style plugin content and the dark variant. */
  theme?: "light" | "dark";
  /** When provided, a close control is rendered at the end of the tab bar. */
  onClose?: (() => void) | undefined;
  /** Data source. Defaults to the in-process DevToolsHooks client. */
  client?: DevToolsClient | undefined;
}

export const DevToolsPanel = ({
  plugins,
  theme = "light",
  onClose,
  client,
}: DevToolsPanelProps) => {
  const resolvedClient = client ?? inProcessClient;
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("thread");
  const [selectionByApi, setSelectionByApi] = useState<
    Record<number, Record<string, string | null>>
  >({});
  const { apiIds, selected, clearEvents, switchToThread } = useDevToolsClient(
    selectedApiId,
    resolvedClient,
  );

  useEffect(() => {
    if (selectedApiId !== null && apiIds.includes(selectedApiId)) return;
    setSelectedApiId(apiIds[0] ?? null);
  }, [apiIds, selectedApiId]);

  const allPlugins = useMemo(
    () =>
      [...builtinPlugins, ...(plugins ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [plugins],
  );

  const setSelectionFor = useCallback(
    (apiId: number, tabId: string, nodeId: string | null) => {
      setSelectionByApi((prev) => ({
        ...prev,
        [apiId]: { ...prev[apiId], [tabId]: nodeId },
      }));
    },
    [],
  );

  const visiblePlugins =
    selected && selectedApiId !== null
      ? allPlugins.filter((plugin) =>
          plugin.isAvailable
            ? plugin.isAvailable({
                apiId: selectedApiId,
                data: selected,
                clearEvents,
                theme,
                selection: null,
                setSelection: () => {},
              })
            : true,
        )
      : allPlugins;

  const activePlugin =
    visiblePlugins.find((plugin) => plugin.id === activeTabId) ??
    visiblePlugins[0];

  const ctx: DevToolsTabContext | null =
    selected && selectedApiId !== null && activePlugin
      ? {
          apiId: selectedApiId,
          data: selected,
          clearEvents,
          theme,
          selection: selectionByApi[selectedApiId]?.[activePlugin.id] ?? null,
          setSelection: (nodeId) =>
            setSelectionFor(selectedApiId, activePlugin.id, nodeId),
          switchToThread: resolvedClient.switchToThread
            ? (threadId) => switchToThread(selectedApiId, threadId)
            : undefined,
        }
      : null;

  return (
    <div className="text-foreground flex h-full flex-col text-[13px]">
      <nav className="border-border flex h-10 shrink-0 items-center justify-between gap-2 border-b px-2 select-none">
        <div className="flex h-full items-center">
          {visiblePlugins.map((plugin) => {
            const active = activePlugin?.id === plugin.id;
            return (
              <button
                type="button"
                key={plugin.id}
                onClick={() => setActiveTabId(plugin.id)}
                className={clsx(
                  "relative flex h-full items-center px-3 font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {plugin.label}
                {active ? (
                  <span className="bg-foreground absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pe-1">
          {apiIds.length > 1 ? (
            <select
              value={selectedApiId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSelectedApiId(Number.isNaN(value) ? null : value);
              }}
              className="border-border text-muted-foreground hover:text-foreground h-7 rounded-md border bg-transparent px-2 text-[12px] transition-colors"
            >
              {apiIds.map((id) => (
                <option key={id} value={id}>
                  API #{id}
                </option>
              ))}
            </select>
          ) : null}

          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {apiIds.length > 0
              ? `${apiIds.length} instance${apiIds.length > 1 ? "s" : ""}`
              : "Waiting"}
          </span>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close DevTools"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </nav>

      <section className="bg-background min-h-0 flex-1 overflow-hidden">
        {ctx && activePlugin ? (
          <activePlugin.Component {...ctx} />
        ) : (
          <CenteredMessage>
            Waiting for assistant-ui instance...
          </CenteredMessage>
        )}
      </section>
    </div>
  );
};
