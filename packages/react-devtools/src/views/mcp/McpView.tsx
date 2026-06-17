import clsx from "clsx";
import {
  CONNECTION_TONE,
  JSONTree,
  SummaryItem,
  SummaryList,
  ToneBadge,
} from "../ui";
import { PartDisclosure } from "../message/PartDisclosure";
import { parseMcpManager } from "./parse";
import type { McpServerPreview } from "./types";

const ServerRow = ({
  server,
  compact,
}: {
  server: McpServerPreview;
  compact?: boolean;
}) => (
  <details className="group">
    <summary
      className={clsx(
        "hover:bg-accent/40 flex cursor-pointer list-none items-center gap-1.5 text-[11px] select-none",
        compact ? "px-0 py-1" : "px-2 py-1.5",
      )}
    >
      <span className="text-muted-foreground inline-block shrink-0 transition-transform group-open:rotate-90">
        ›
      </span>
      <span className="text-foreground min-w-0 flex-1 truncate font-medium">
        {server.name}
      </span>
      <ToneBadge tone={CONNECTION_TONE[server.connectionState]} size="sm">
        {server.connectionState}
      </ToneBadge>
      {server.kind ? (
        <span className="text-muted-foreground shrink-0 text-[10px]">
          {server.kind}
        </span>
      ) : null}
    </summary>

    <div
      className={clsx(
        "flex flex-col gap-1.5 pb-1",
        compact ? "ps-3.5" : "border-border border-t px-2 py-1.5",
      )}
    >
      {server.url ? (
        <div className="text-muted-foreground font-mono text-[10px] break-all">
          {server.url}
        </div>
      ) : null}

      {server.lastError ? (
        <div className="text-[11px] text-red-600 dark:text-red-400">
          {server.lastError}
        </div>
      ) : null}

      {server.authorizationUrl ? (
        <div className="text-[11px] break-all text-amber-600 dark:text-amber-400">
          Authorization required: {server.authorizationUrl}
        </div>
      ) : null}

      {server.tools.length ? (
        <PartDisclosure label={`Tools (${server.tools.length})`}>
          <div className="flex flex-col gap-1">
            {server.tools.map((tool) => (
              <div key={tool.name} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground text-[11px] font-medium">
                  {tool.name}
                </span>
                {tool.description ? (
                  <span className="text-muted-foreground text-[10px] leading-snug">
                    {tool.description}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </PartDisclosure>
      ) : (
        <div className="text-muted-foreground text-[11px]">
          No tools discovered.
        </div>
      )}
    </div>
  </details>
);

export const McpView = ({
  value,
  compact = false,
}: {
  value: unknown;
  compact?: boolean;
}) => {
  const manager = parseMcpManager(value);
  if (!manager) return <JSONTree value={value} compact />;

  return (
    <div className="flex flex-col gap-2">
      <SummaryList>
        <SummaryItem label="Servers" value={String(manager.servers.length)} />
        {typeof manager.isHydrated === "boolean" ? (
          <SummaryItem label="Hydrated" value={String(manager.isHydrated)} />
        ) : null}
      </SummaryList>

      {manager.servers.length ? (
        <div className="flex flex-col">
          {manager.servers.map((server) => (
            <ServerRow key={server.id} server={server} compact={compact} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-[12px]">
          No MCP servers registered.
        </div>
      )}
    </div>
  );
};
