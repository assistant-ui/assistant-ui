import { EmptyState } from "../../views/ui";
import { renderStatePreview } from "../statePreview";
import type { DevToolsTabContext } from "../registry";

const THREAD_STATE_KEYS = new Set([
  "threads",
  "threadListItems",
  "thread",
  "threadListItem",
  "threadlistitem",
  "composer",
]);

export const ThreadTab = ({ data }: DevToolsTabContext) => {
  const entries = Object.entries(data.state).filter(([key]) =>
    THREAD_STATE_KEYS.has(key),
  );

  if (entries.length === 0) {
    return (
      <EmptyState>No thread state for this assistant instance.</EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map(([key, value]) => (
        <div key={key}>{renderStatePreview(key, value)}</div>
      ))}
    </div>
  );
};
