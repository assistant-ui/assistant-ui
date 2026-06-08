import type { ComposerQueueItem } from "./types";

export const ComposerQueue = ({
  queue,
}: {
  queue: readonly ComposerQueueItem[];
}) => {
  if (!queue.length) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-500/5 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
        Message Queue ({queue.length})
      </div>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[11px] text-zinc-700 dark:text-zinc-200">
        {queue.map((item, index) => (
          <li
            key={item.id ?? index}
            className="wrap-break-word whitespace-pre-wrap"
          >
            {item.prompt || "(empty)"}
          </li>
        ))}
      </ol>
    </div>
  );
};
