import { useCallback } from "react";
import {
  useEditComposerStore,
  useMessageStore,
  useMessageUtilsStore,
} from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import { getThreadMessageText } from "../../utils/getThreadMessageText";

export type UseActionBarCopyProps = {
  copiedDuration?: number | undefined;
};

export const useActionBarCopy = ({
  copiedDuration = 3000,
}: UseActionBarCopyProps = {}) => {
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();
  const editComposerStore = useEditComposerStore();
  const hasCopyableContent = useCombinedStore(
    [messageStore, editComposerStore],
    ({ message }, c) => {
      return (
        !c.isEditing &&
        (message.role !== "assistant" || message.status.type !== "running") &&
        message.content.some((c) => c.type === "text" && c.text.length > 0)
      );
    },
  );

  const callback = useCallback(() => {
    const { message } = messageStore.getState();
    const { setIsCopied } = messageUtilsStore.getState();
    const { isEditing, text: composerValue } = editComposerStore.getState();

    const valueToCopy = isEditing
      ? composerValue
      : getThreadMessageText(message);

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  }, [messageStore, messageUtilsStore, editComposerStore, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};
