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

export const ChainOfThought = ({
  parts,
}: {
  parts: readonly PartPreview[];
}) => {
  const status = rollupStatus(parts);

  return (
    <details open className="group bg-muted/40 rounded-md border p-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 select-none">
        <span className="text-muted-foreground inline-block transition-transform group-open:rotate-90">
          ›
        </span>
        <ToneBadge tone="violet">reasoning</ToneBadge>
        <span className="text-foreground text-[10px] font-medium">
          Chain of thought
        </span>
        <span className="text-muted-foreground text-[10px]">
          {parts.length} step{parts.length === 1 ? "" : "s"}
        </span>
        {status ? (
          <StatusBadge type={status.type} reason={status.reason} />
        ) : null}
      </summary>
      <div className="mt-2 flex flex-col gap-2 border-l pl-3">
        {parts.map((part, index) => (
          <PartView key={partKey(part, index)} part={part} />
        ))}
      </div>
    </details>
  );
};
