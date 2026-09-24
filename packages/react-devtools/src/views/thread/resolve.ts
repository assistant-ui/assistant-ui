import { parseThreadListPreview, parseThreadPreview } from "./utils";
import type { ThreadListPreview, ThreadPreview } from "./types";

/**
 * Picks the thread to show for a selected conversation id, preferring a cached
 * snapshot, then the live main thread.
 */
export const resolveThreadForId = (
  snapshots: Readonly<Record<string, unknown>> | undefined,
  threadId: string,
  threadList: ThreadListPreview | null,
): ThreadPreview | null => {
  const fromSnapshot = snapshots?.[threadId];
  if (fromSnapshot) {
    const parsed = parseThreadPreview(fromSnapshot);
    if (parsed) return parsed;
  }
  if (threadList?.mainThreadId === threadId && threadList.main) {
    return threadList.main;
  }
  return null;
};

/** Picks the thread to show when the runtime exposes no conversation list. */
export const resolveSingleThread = (
  state: Record<string, unknown>,
): ThreadPreview | null => {
  const single = parseThreadPreview(state.thread);
  if (single && single.messages.length) return single;
  const list = parseThreadListPreview(state.threads);
  if (list?.main && list.main.messages.length) return list.main;
  return single ?? list?.main ?? null;
};
