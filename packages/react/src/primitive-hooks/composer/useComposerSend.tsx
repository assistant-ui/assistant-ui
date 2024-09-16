import { useCallback } from "react";
import { useComposerStore } from "../../context";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import {
  useThreadComposerStore,
  useThreadStore,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";

export const useComposerSend = () => {
  const threadStore = useThreadStore();
  const threadViewportStore = useThreadViewportStore();
  const composerStore = useComposerStore();
  const threadComposerStore = useThreadComposerStore();

  const disabled = useCombinedStore(
    [threadStore, composerStore],
    (t, c) => t.isRunning || !c.isEditing || c.isEmpty,
  );

  const callback = useCallback(() => {
    const composerState = composerStore.getState();
    if (!composerState.isEditing) return;

    composerState.send();

    threadViewportStore.getState().scrollToBottom();
    threadComposerStore.getState().focus();
  }, [threadComposerStore, composerStore, threadViewportStore]);

  if (disabled) return null;
  return callback;
};
