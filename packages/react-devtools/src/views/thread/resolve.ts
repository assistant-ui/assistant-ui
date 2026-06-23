import { parseThreadListPreview, parseThreadPreview } from "./utils";
import type { ThreadListPreview, ThreadPreview } from "./types";

/**
 * Picks the thread to show for a selected conversation id, preferring a cached
 * snapshot, then the live main thread, then the single-thread runtime state.
 */
export const resolveThreadForId = (
  state: Record<string, unknown>,
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
  const single = parseThreadPreview(state.thread);
  if (single && threadList?.threadIds.length === 0) return single;
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
