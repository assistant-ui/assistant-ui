import { useCallback } from "react";

import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import {
  useEditComposerStore,
  useMessageStore,
  useMessageUtilsStore,
  useThreadRuntime,
} from "../../context";

export const useActionBarSpeak = () => {
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const threadRuntime = useThreadRuntime();
  const messageUtilsStore = useMessageUtilsStore();

  const hasSpeakableContent = useCombinedStore(
    [messageStore, editComposerStore],
    ({ message }, c) => {
      return (
        !c.isEditing &&
        (message.role !== "assistant" || message.status.type !== "running") &&
        message.content.some((c) => c.type === "text" && c.text.length > 0)
      );
    },
  );

  const callback = useCallback(async () => {
    const { message } = messageStore.getState();
    const utt = threadRuntime.speak(message.id);
    messageUtilsStore.getState().addUtterance(utt);
  }, [threadRuntime, messageStore, messageUtilsStore]);

  if (!hasSpeakableContent) return null;
  return callback;
};
