import { SectionLabel } from "../ui";
import type { ComposerQueueItem } from "./types";

export const ComposerQueue = ({
  queue,
}: {
  queue: readonly ComposerQueueItem[];
}) => {
  if (!queue.length) return null;

  return (
    <div className="bg-card rounded-md border p-3">
      <SectionLabel>Message queue ({queue.length})</SectionLabel>
      <ol className="text-foreground mt-1 list-decimal space-y-0.5 pl-5 text-[11px]">
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
