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
    <details
      open
      className="group rounded-md border border-dashed border-violet-300/70 bg-violet-500/5 p-2 dark:border-violet-500/30 dark:bg-violet-500/10"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 select-none">
        <span className="inline-block text-violet-500 transition-transform group-open:rotate-90">
          ›
        </span>
        <span className="text-[10px] font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
          Chain of thought
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {parts.length} step{parts.length === 1 ? "" : "s"}
        </span>
        {status ? (
          <StatusBadge type={status.type} reason={status.reason} />
        ) : null}
      </summary>
      <div className="mt-2 flex flex-col gap-2 border-l border-violet-300/50 pl-3 dark:border-violet-500/20">
        {parts.map((part, index) => (
          <PartView key={partKey(part, index)} part={part} />
        ))}
      </div>
    </details>
  );
};
