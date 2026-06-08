import clsx from "clsx";
import { BADGE_TONE, JSONPreview, SummaryItem } from "../ui";
import type { BadgeTone } from "../ui";
import { parseMcpManager } from "./parse";
import type { McpServerPreview } from "./types";

const STATE_TONE: Record<string, BadgeTone> = {
  connected: "emerald",
  connecting: "blue",
  authPending: "blue",
  authRequired: "amber",
  disconnected: "zinc",
  error: "red",
};

const ServerCard = ({ server }: { server: McpServerPreview }) => (
  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] dark:border-zinc-800 dark:bg-zinc-900/40">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
        {server.name}
      </span>
      {server.kind ? (
        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
          {server.kind}
        </span>
      ) : null}
      <span
        className={clsx(
          "rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          BADGE_TONE[STATE_TONE[server.connectionState] ?? "zinc"],
        )}
      >
        {server.connectionState}
      </span>
    </div>

    {server.url ? (
      <div className="mt-1 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        {server.url}
      </div>
    ) : null}

    {server.lastError ? (
      <div className="mt-2 rounded border border-red-300 bg-red-500/5 p-2 text-red-700 dark:border-red-500/40 dark:text-red-300">
        {server.lastError}
      </div>
    ) : null}

    {server.authorizationUrl ? (
      <div className="mt-2 text-[10px] break-all text-amber-700 dark:text-amber-300">
        Authorization required: {server.authorizationUrl}
      </div>
    ) : null}

    <div className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
      Tools ({server.tools.length})
    </div>
    {server.tools.length ? (
      <ul className="mt-1 flex flex-col gap-1">
        {server.tools.map((tool) => (
          <li key={tool.name} className="text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {tool.name}
            </span>
            {tool.description ? (
              <span className="ml-1 text-zinc-400">{tool.description}</span>
            ) : null}
          </li>
        ))}
      </ul>
    ) : (
      <div className="mt-1 text-zinc-400">No tools discovered.</div>
    )}
  </div>
);

export const McpView = ({ value }: { value: unknown }) => {
  const manager = parseMcpManager(value);
  if (!manager) return <JSONPreview value={value} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Servers" value={String(manager.servers.length)} />
        {typeof manager.isHydrated === "boolean" ? (
          <SummaryItem label="Hydrated" value={String(manager.isHydrated)} />
        ) : null}
      </div>
      {manager.servers.length ? (
        <div className="flex flex-col gap-2">
          {manager.servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No MCP servers registered.
        </div>
      )}
    </div>
  );
};
