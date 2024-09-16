import { useCallback } from "react";
import { useMessageStore } from "../../context/react/MessageContext";
import {
  useThreadActionsStore,
  useThreadComposerStore,
  useThreadStore,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarReload = () => {
  const messageStore = useMessageStore();
  const threadStore = useThreadStore();
  const threadActionsStore = useThreadActionsStore();
  const threadComposerStore = useThreadComposerStore();
  const threadViewportStore = useThreadViewportStore();

  const disabled = useCombinedStore(
    [threadStore, messageStore],
    (t, m) => t.isRunning || t.isDisabled || m.message.role !== "assistant",
  );

  const callback = useCallback(() => {
    const { parentId } = messageStore.getState();
    threadActionsStore.getState().startRun(parentId);
    threadViewportStore.getState().scrollToBottom();
    threadComposerStore.getState().focus();
  }, [
    threadActionsStore,
    threadComposerStore,
    threadViewportStore,
    messageStore,
  ]);

  if (disabled) return null;
  return callback;
};
