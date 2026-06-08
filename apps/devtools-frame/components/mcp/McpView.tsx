import { Chip, JSONPreview, SectionLabel, SummaryItem, ToneBadge } from "../ui";
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
  <div className="bg-card rounded-lg border p-3 text-[11px]">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-foreground font-semibold">{server.name}</span>
      {server.kind ? <Chip>{server.kind}</Chip> : null}
      <ToneBadge tone={STATE_TONE[server.connectionState]}>
        {server.connectionState}
      </ToneBadge>
    </div>

    {server.url ? (
      <div className="text-muted-foreground mt-1 font-mono text-[10px]">
        {server.url}
      </div>
    ) : null}

    {server.lastError ? (
      <div className="mt-2 rounded-md border border-red-300 bg-red-500/10 p-2 text-red-700 dark:border-red-500/40 dark:text-red-300">
        {server.lastError}
      </div>
    ) : null}

    {server.authorizationUrl ? (
      <div className="mt-2 text-[10px] break-all text-amber-700 dark:text-amber-300">
        Authorization required: {server.authorizationUrl}
      </div>
    ) : null}

    <div className="mt-2">
      <SectionLabel>Tools ({server.tools.length})</SectionLabel>
    </div>
    {server.tools.length ? (
      <ul className="mt-1 flex flex-col gap-1">
        {server.tools.map((tool) => (
          <li key={tool.name} className="text-muted-foreground">
            <span className="text-foreground font-medium">{tool.name}</span>
            {tool.description ? (
              <span className="text-muted-foreground ml-1">
                {tool.description}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-muted-foreground mt-1">No tools discovered.</div>
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
        <div className="text-muted-foreground text-[11px]">
          No MCP servers registered.
        </div>
      )}
    </div>
  );
};
