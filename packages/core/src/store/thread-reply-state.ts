/**
 * Where the reply to a thread's last message stands when that message is
 * the user's and this session is not running it: `in-progress` while another
 * tab or session holds a fresh run lease answering it, `interrupted` once no
 * run does (it never started, or went `staleAfter` without a heartbeat
 * before it stored anything). A reply that is already stored carries its own
 * run state instead. Undefined for every other thread, and for runtimes that
 * do not report runs (only Assistant Cloud does).
 */
export type ThreadReplyState = "in-progress" | "interrupted";

const states = new Map<string, ThreadReplyState>();
const listeners = new Map<string, Set<() => void>>();

/** Keyed by thread list item id; set by the Assistant Cloud run tracker. */
export const setThreadReplyState = (
  threadItemId: string,
  state: ThreadReplyState | undefined,
): void => {
  if (states.get(threadItemId) === state) return;
  if (state === undefined) states.delete(threadItemId);
  else states.set(threadItemId, state);
  for (const listener of listeners.get(threadItemId) ?? []) listener();
};

export const getThreadReplyState = (
  threadItemId: string | undefined,
): ThreadReplyState | undefined =>
  threadItemId === undefined ? undefined : states.get(threadItemId);

export const subscribeThreadReplyState = (
  threadItemId: string | undefined,
  listener: () => void,
): (() => void) => {
  if (threadItemId === undefined) return () => {};
  let set = listeners.get(threadItemId);
  if (!set) {
    set = new Set();
    listeners.set(threadItemId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(threadItemId);
  };
};
