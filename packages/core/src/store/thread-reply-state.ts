import type { AssistantClient } from "@assistant-ui/store";

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

/** The runtime a reply state belongs to, so two providers showing one thread keep their own. */
type ThreadReplyScope = object;

// Clients without an assistant runtime share one scope.
const SHARED_SCOPE: ThreadReplyScope = {};

const states = new WeakMap<ThreadReplyScope, Map<string, ThreadReplyState>>();
const listeners = new WeakMap<ThreadReplyScope, Map<string, Set<() => void>>>();

const entryOf = <T>(
  map: WeakMap<ThreadReplyScope, Map<string, T>>,
  scope: ThreadReplyScope,
) => {
  let entry = map.get(scope);
  if (!entry) {
    entry = new Map();
    map.set(scope, entry);
  }
  return entry;
};

/** The scope of the runtime `aui` belongs to: its assistant runtime. */
export const threadReplyScopeOf = (aui: AssistantClient): ThreadReplyScope => {
  try {
    return aui.threads.__internal_getAssistantRuntime?.() ?? SHARED_SCOPE;
  } catch {
    return SHARED_SCOPE;
  }
};

/** Keyed by runtime and thread list item id; set by the Assistant Cloud run tracker. */
export const setThreadReplyState = (
  scope: ThreadReplyScope,
  threadItemId: string,
  state: ThreadReplyState | undefined,
): void => {
  const scoped = entryOf(states, scope);
  if (scoped.get(threadItemId) === state) return;
  if (state === undefined) scoped.delete(threadItemId);
  else scoped.set(threadItemId, state);
  for (const listener of listeners.get(scope)?.get(threadItemId) ?? [])
    listener();
};

export const getThreadReplyState = (
  scope: ThreadReplyScope,
  threadItemId: string | undefined,
): ThreadReplyState | undefined =>
  threadItemId === undefined ? undefined : states.get(scope)?.get(threadItemId);

export const subscribeThreadReplyState = (
  scope: ThreadReplyScope,
  threadItemId: string | undefined,
  listener: () => void,
): (() => void) => {
  if (threadItemId === undefined) return () => {};
  const scoped = entryOf(listeners, scope);
  let set = scoped.get(threadItemId);
  if (!set) {
    set = new Set();
    scoped.set(threadItemId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    // An older cleanup called again leaves a newer listener set in place.
    if (set.size === 0 && scoped.get(threadItemId) === set)
      scoped.delete(threadItemId);
  };
};
