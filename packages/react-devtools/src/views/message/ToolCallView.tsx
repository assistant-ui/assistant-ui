import clsx from "clsx";
import { JSONTree, ToneBadge } from "../ui";
import { PartDisclosure } from "./PartDisclosure";
import { StatusBadge } from "./StatusBadge";
import type { ToolCallPartPreview } from "./types";

const isAwaiting = (part: ToolCallPartPreview) =>
  part.status?.type === "requires-action" ||
  part.interrupt !== undefined ||
  (part.approval !== undefined && part.approval.approved === undefined);

const sameAsArgsJson = (part: ToolCallPartPreview) => {
  if (part.argsText === undefined) return false;
  try {
    return part.argsText.trim() === JSON.stringify(part.args);
  } catch {
    return false;
  }
};

export const ToolCallView = ({
  part,
  nested = false,
}: {
  part: ToolCallPartPreview;
  nested?: boolean;
}) => {
  const awaiting = isAwaiting(part);

  return (
    <details
      open={awaiting}
      className={clsx(
        "group",
        !nested && "border-border overflow-hidden rounded-md border",
      )}
    >
      <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-[11px] select-none">
        <span className="text-muted-foreground inline-block shrink-0 transition-transform group-open:rotate-90">
          ›
        </span>
        <span className="text-foreground min-w-0 flex-1 truncate font-medium">
          {part.toolName}
        </span>
        {part.status ? (
          <StatusBadge
            type={part.status.type}
            reason={part.status.reason}
            compact
            size="sm"
          />
        ) : null}
        {part.isError ? (
          <StatusBadge type="incomplete" reason="error" compact size="sm" />
        ) : null}
        {part.mcp !== undefined ? (
          <ToneBadge tone="violet" size="sm">
            mcp
          </ToneBadge>
        ) : null}
      </summary>

      <div className="border-border flex flex-col gap-0.5 border-t px-2 py-1">
        {awaiting ? (
          <div className="bg-muted/50 rounded border px-2 py-1.5 text-[10px]">
            <ToneBadge tone="amber" size="sm">
              {part.approval ? "Awaiting approval" : "Awaiting human input"}
            </ToneBadge>
            {part.approval ? (
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                {part.approval.id ? <span>id: {part.approval.id}</span> : null}
                <span>
                  approved:{" "}
                  {part.approval.approved === undefined
                    ? "pending"
                    : String(part.approval.approved)}
                </span>
                {part.approval.isAutomatic !== undefined ? (
                  <span>auto: {String(part.approval.isAutomatic)}</span>
                ) : null}
                {part.approval.reason ? (
                  <span>{part.approval.reason}</span>
                ) : null}
              </div>
            ) : null}
            {part.interrupt?.payload !== undefined ? (
              <div className="mt-1">
                <JSONTree
                  value={part.interrupt.payload}
                  openDepth={0}
                  compact
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {part.toolCallId ? (
          <PartDisclosure label="Call id">
            <span className="text-muted-foreground font-mono text-[10px] break-all">
              {part.toolCallId}
            </span>
          </PartDisclosure>
        ) : null}

        <PartDisclosure label="Arguments">
          <JSONTree value={part.args} openDepth={0} compact />
        </PartDisclosure>

        {part.argsText !== undefined && !sameAsArgsJson(part) ? (
          <PartDisclosure label="Raw args">
            <pre className="text-foreground font-mono text-[10px] leading-snug break-words whitespace-pre-wrap">
              {part.argsText}
            </pre>
          </PartDisclosure>
        ) : null}

        {part.result !== undefined ? (
          <PartDisclosure label={part.isError ? "Result (error)" : "Result"}>
            <JSONTree value={part.result} openDepth={0} compact />
          </PartDisclosure>
        ) : null}

        {part.artifact !== undefined ? (
          <PartDisclosure label="Artifact">
            <JSONTree value={part.artifact} openDepth={0} compact />
          </PartDisclosure>
        ) : null}

        {part.modelContent !== undefined ? (
          <PartDisclosure label="Model content">
            <JSONTree value={part.modelContent} openDepth={0} compact />
          </PartDisclosure>
        ) : null}

        {part.mcp !== undefined ? (
          <PartDisclosure label="MCP">
            <JSONTree value={part.mcp} openDepth={0} compact />
          </PartDisclosure>
        ) : null}

        {part.subMessageCount > 0 ? (
          <span className="text-muted-foreground text-[10px]">
            {part.subMessageCount} nested sub-agent message
            {part.subMessageCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </details>
  );
};
