import { useCallback, useRef, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

/** Resumes an adapter-owned checkpoint without resending or regenerating a message. */
export const useComposerResume = () => {
  const aui = useAui();
  const inFlight = useRef(new Set<string>());
  const [pendingThreads, setPendingThreads] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const threadId = useAuiState((s) => s.threadListItem.id);
  const isResuming = pendingThreads.has(threadId);
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
    if (
      inFlight.current.has(targetId) ||
      !state.canResume ||
      state.isRunning ||
      state.isLoading ||
      state.isDisabled ||
      state.voice !== undefined ||
      composer.type !== "thread" ||
      !composer.isEmpty
    )
      return;
    inFlight.current.add(targetId);
    setPendingThreads(new Set(inFlight.current));
    try {
      await thread.resumeRun({ parentId: state.messages.at(-1)?.id ?? null });
    } finally {
      inFlight.current.delete(targetId);
      setPendingThreads(new Set(inFlight.current));
    }
  }, [aui]);

  return { resume, disabled: disabled || isResuming, isResuming };
};
