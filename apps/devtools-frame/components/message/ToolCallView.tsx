import type { ReactNode } from "react";
import { Chip, JSONPreview, ToneBadge } from "../ui";
import { StatusBadge } from "./StatusBadge";
import type { ToolCallPartPreview } from "./types";

const Disclosure = ({
  label,
  defaultOpen,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <details open={defaultOpen} className="group">
    <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-[10px] font-medium select-none">
      <span className="mr-1 inline-block transition-transform group-open:rotate-90">
        ›
      </span>
      {label}
    </summary>
    <div className="mt-1">{children}</div>
  </details>
);

export const ToolCallView = ({ part }: { part: ToolCallPartPreview }) => {
  const awaiting =
    part.status?.type === "requires-action" ||
    part.interrupt !== undefined ||
    (part.approval !== undefined && part.approval.approved === undefined);
  return (
    <div className="bg-card rounded-md border p-3 text-[11px] transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>tool</Chip>
        <span className="text-foreground font-semibold">{part.toolName}</span>
        {part.status ? (
          <StatusBadge type={part.status.type} reason={part.status.reason} />
        ) : null}
        {part.isError ? <StatusBadge type="incomplete" reason="error" /> : null}
        {part.mcp !== undefined ? (
          <ToneBadge tone="violet">MCP</ToneBadge>
        ) : null}
      </div>

      {part.toolCallId ? (
        <div className="text-muted-foreground mt-1 font-mono text-[10px]">
          {part.toolCallId}
        </div>
      ) : null}

      {awaiting ? (
        <div className="bg-muted text-foreground mt-2 rounded-md border p-2">
          <ToneBadge tone="amber">
            {part.approval ? "Awaiting approval" : "Awaiting human input"}
          </ToneBadge>
          {part.approval ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
              {part.approval.id ? <span>id: {part.approval.id}</span> : null}
              <span>
                approved:{" "}
                {part.approval.approved === undefined
                  ? "pending"
                  : String(part.approval.approved)}
              </span>
              {part.approval.isAutomatic !== undefined ? (
                <span>automatic: {String(part.approval.isAutomatic)}</span>
              ) : null}
              {part.approval.reason ? (
                <span>reason: {part.approval.reason}</span>
              ) : null}
            </div>
          ) : null}
          {part.interrupt?.payload !== undefined ? (
            <div className="mt-1">
              <JSONPreview value={part.interrupt.payload} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        <Disclosure label="Arguments" defaultOpen>
          <JSONPreview value={part.args} />
        </Disclosure>

        {part.argsText !== undefined ? (
          <Disclosure label="Raw args text">
            <pre className="bg-muted text-foreground rounded-md p-2 text-[10px] break-words whitespace-pre-wrap">
              {part.argsText}
            </pre>
          </Disclosure>
        ) : null}

        {part.result !== undefined ? (
          <Disclosure label={part.isError ? "Result (error)" : "Result"}>
            <JSONPreview value={part.result} />
          </Disclosure>
        ) : null}

        {part.artifact !== undefined ? (
          <Disclosure label="Artifact">
            <JSONPreview value={part.artifact} />
          </Disclosure>
        ) : null}

        {part.modelContent !== undefined ? (
          <Disclosure label="Model content">
            <JSONPreview value={part.modelContent} />
          </Disclosure>
        ) : null}

        {part.mcp !== undefined ? (
          <Disclosure label="MCP metadata">
            <JSONPreview value={part.mcp} />
          </Disclosure>
        ) : null}

        {part.subMessageCount > 0 ? (
          <div className="text-muted-foreground text-[10px]">
            {part.subMessageCount} nested sub-agent message
            {part.subMessageCount === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    </div>
  );
};
