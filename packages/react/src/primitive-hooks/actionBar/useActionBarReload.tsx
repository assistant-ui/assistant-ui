import { useCallback } from "react";
import { useMessageStore } from "../../context/react/MessageContext";
import {
  useThreadComposerStore,
  useThreadRuntime,
  useThreadStore,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarReload = () => {
  const messageStore = useMessageStore();
  const threadStore = useThreadStore();
  const threadRuntime = useThreadRuntime();
  const threadComposerStore = useThreadComposerStore();
  const threadViewportStore = useThreadViewportStore();

  const disabled = useCombinedStore(
    [threadStore, messageStore],
    (t, m) => t.isRunning || t.isDisabled || m.message.role !== "assistant",
  );

  const callback = useCallback(() => {
    const { parentId } = messageStore.getState();
    threadRuntime.startRun(parentId);
    threadViewportStore.getState().scrollToBottom();
    threadComposerStore.getState().focus();
  }, [threadRuntime, threadComposerStore, threadViewportStore, messageStore]);

  if (disabled) return null;
  return callback;
};
