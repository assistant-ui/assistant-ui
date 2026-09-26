import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

/** Resumes an adapter-owned checkpoint without resending or regenerating a message. */
export const useComposerResume = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      !s.thread.canResume ||
      s.composer.type !== "thread" ||
      !s.composer.isEmpty,
  );

  const resume = useCallback(async () => {
    const thread = aui.thread();
    const state = thread.getState();
    const composer = aui.composer.getState();
    if (!state.canResume || composer.type !== "thread" || !composer.isEmpty)
      return;
    await thread.resumeRun({ parentId: state.messages.at(-1)?.id ?? null });
  }, [aui]);

  return { resume, disabled };
};
