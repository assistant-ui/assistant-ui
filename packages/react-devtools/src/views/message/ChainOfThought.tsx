import { ToneBadge } from "../ui";
import { partKey } from "./parse";
import { PartView } from "./PartView";
import { StatusBadge } from "./StatusBadge";
import type { PartPreview, PartStatusPreview } from "./types";

const rollupStatus = (
  parts: readonly PartPreview[],
): PartStatusPreview | undefined => {
  const statuses = parts
    .map((part) => part.status)
    .filter((status): status is PartStatusPreview => Boolean(status));
  if (statuses.length === 0) return undefined;

  if (statuses.some((status) => status.type === "running")) {
    return { type: "running" };
  }
  if (statuses.some((status) => status.type === "requires-action")) {
    return { type: "requires-action" };
  }
  const incomplete = statuses.find((status) => status.type === "incomplete");
  if (incomplete) return incomplete;
  return { type: "complete" };
};

const hasAwaitingTool = (parts: readonly PartPreview[]) =>
  parts.some(
    (part) =>
      part.type === "tool-call" &&
      (part.status?.type === "requires-action" ||
        (part.approval !== undefined && part.approval.approved === undefined) ||
        part.interrupt !== undefined),
  );

export const ChainOfThought = ({
  parts,
}: {
  parts: readonly PartPreview[];
}) => {
  const status = rollupStatus(parts);
  const defaultOpen = hasAwaitingTool(parts);

  return (
    <details
      open={defaultOpen}
      className="group border-border overflow-hidden rounded-md border"
    >
      <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 select-none">
        <span className="text-muted-foreground inline-block shrink-0 transition-transform group-open:rotate-90">
          ›
        </span>
        <ToneBadge tone="violet" size="sm">
          cot
        </ToneBadge>
        <span className="text-muted-foreground text-[10px]">
          {parts.length} step{parts.length === 1 ? "" : "s"}
        </span>
        {status ? (
          <StatusBadge
            type={status.type}
            reason={status.reason}
            compact
            size="sm"
          />
        ) : null}
      </summary>
      <div className="border-border divide-border divide-y border-t">
        {parts.map((part, index) => (
          <PartView key={partKey(part, index)} part={part} compact />
        ))}
      </div>
    </details>
  );
};
