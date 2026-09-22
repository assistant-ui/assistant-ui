import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getClientId, useAui, useAuiState } from "@assistant-ui/store";

type ResumeState = {
  pending: boolean;
  listeners: Set<() => void>;
};

const resumeStates = new WeakMap<
  getClientId.ClientId,
  Map<string, ResumeState>
>();
const getResumeState = (thread: object, threadId: string): ResumeState => {
  const clientId = getClientId(thread);
  let states = resumeStates.get(clientId);
  if (!states) {
    states = new Map();
    resumeStates.set(clientId, states);
  }
  let state = states.get(threadId);
  if (!state) {
    state = { pending: false, listeners: new Set() };
    states.set(threadId, state);
  }
  return state;
};

const setPending = (state: ResumeState, pending: boolean) => {
  state.pending = pending;
  for (const listener of state.listeners) listener();
};

const getServerPending = () => false;

/** Resumes an adapter-owned checkpoint without resending or regenerating a message. */
export const useComposerResume = () => {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const pendingState = getResumeState(aui.thread(), threadId);
  const pendingStore = useMemo(
    () => ({
      subscribe: (listener: () => void) => {
        pendingState.listeners.add(listener);
        return () => {
          pendingState.listeners.delete(listener);
        };
      },
      getSnapshot: () => pendingState.pending,
    }),
    [pendingState],
  );
  const isResuming = useSyncExternalStore(
    pendingStore.subscribe,
    pendingStore.getSnapshot,
    getServerPending,
  );
  const disabled = useAuiState(
    (s) =>
      !s.thread.canResume ||
      s.thread.isRunning ||
      s.thread.isLoading ||
      s.thread.isDisabled ||
      s.thread.voice !== undefined ||
      s.composer.type !== "thread" ||
      !s.composer.isEmpty,
  );

  const resume = useCallback(async () => {
    const thread = aui.thread();
    const state = thread.getState();
    const composer = aui.composer.getState();
    const targetId = aui.threadListItem().getState().id;
    const target = getResumeState(thread, targetId);
    if (
      target.pending ||
      !state.canResume ||
      state.isRunning ||
      state.isLoading ||
      state.isDisabled ||
      state.voice !== undefined ||
      composer.type !== "thread" ||
      !composer.isEmpty
    )
      return;
    setPending(target, true);
    try {
      await thread.resumeRun({ parentId: state.messages.at(-1)?.id ?? null });
    } finally {
      setPending(target, false);
    }
  }, [aui]);

  return { resume, disabled: disabled || isResuming, isResuming };
};
