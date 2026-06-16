"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useDevToolsClient } from "../data/useDevToolsClient";
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
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("thread");
  const { apiIds, selected, clearEvents } = useDevToolsClient(
    selectedApiId,
    client,
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

  const ctx: DevToolsTabContext | null =
    selected && selectedApiId !== null
      ? { apiId: selectedApiId, data: selected, clearEvents, theme }
      : null;

  const visiblePlugins = ctx
    ? allPlugins.filter((plugin) =>
        plugin.isAvailable ? plugin.isAvailable(ctx) : true,
      )
    : allPlugins;

  const activePlugin =
    visiblePlugins.find((plugin) => plugin.id === activeTabId) ??
    visiblePlugins[0];

  const showApiSelector = apiIds.length > 1;

  return (
    <div className="h-full w-full">
      <div className="bg-background text-foreground flex h-full flex-col text-xs">
        {showApiSelector ? (
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
              {apiIds.map((id) => (
                <option key={id} value={id}>
                  API #{id}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="bg-muted flex h-10 items-center justify-between border-b px-2">
          <div className="flex h-full items-center gap-1">
            {visiblePlugins.map((plugin) => (
              <button
                type="button"
                key={plugin.id}
                onClick={() => setActiveTabId(plugin.id)}
                className={clsx(
                  "flex h-full items-center px-2.5 text-xs font-medium transition-colors",
                  activePlugin?.id === plugin.id
                    ? "border-foreground text-foreground border-b-2"
                    : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
                )}
              >
                {plugin.label}
              </button>
            ))}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close DevTools"
              className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 items-center justify-center rounded-md transition-colors"
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
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </nav>

        <section className="bg-background flex-1 overflow-auto p-4">
          {ctx && activePlugin ? (
            <activePlugin.Component {...ctx} />
          ) : (
            <CenteredMessage>
              Waiting for assistant-ui instance...
            </CenteredMessage>
          )}
        </section>

        <footer className="bg-muted text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-[11px]">
          <span>
            {apiIds.length > 0
              ? `${apiIds.length} assistant instance${apiIds.length > 1 ? "s" : ""} detected`
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
};
