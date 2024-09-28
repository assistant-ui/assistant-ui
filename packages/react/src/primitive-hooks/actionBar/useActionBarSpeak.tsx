import { useCallback } from "react";

import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import {
  useEditComposerStore,
  useMessageRuntime,
  useMessageStore,
  useMessageUtilsStore,
} from "../../context";

export const useActionBarSpeak = () => {
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const messageRunime = useMessageRuntime();
  const messageUtilsStore = useMessageUtilsStore();

  const hasSpeakableContent = useCombinedStore(
    [messageStore, editComposerStore],
    (message, c) => {
      return (
        !c.isEditing &&
        (message.role !== "assistant" || message.status.type !== "running") &&
        message.content.some((c) => c.type === "text" && c.text.length > 0)
      );
    },
  );

  const callback = useCallback(async () => {
    const utt = messageRunime.speak();
    messageUtilsStore.getState().addUtterance(utt);
  }, [messageRunime, messageUtilsStore]);

  if (!hasSpeakableContent) return null;
  return callback;
};
