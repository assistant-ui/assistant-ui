import { useCallback } from "react";
import {
  useMessageRuntime,
  useMessageStore,
} from "../../context/react/MessageContext";
import {
  useThreadComposerStore,
  useThreadStore,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarReload = () => {
  const messageStore = useMessageStore();
  const threadStore = useThreadStore();
  const messageRuntime = useMessageRuntime();
  const threadComposerStore = useThreadComposerStore();
  const threadViewportStore = useThreadViewportStore();

  const disabled = useCombinedStore(
    [threadStore, messageStore],
    (t, m) => t.isRunning || t.isDisabled || m.role !== "assistant",
  );

  const callback = useCallback(() => {
    messageRuntime.reload();
    threadViewportStore.getState().scrollToBottom();
    threadComposerStore.getState().focus();
  }, [messageRuntime, threadComposerStore, threadViewportStore]);

  if (disabled) return null;
  return callback;
};
