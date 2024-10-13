import { useCallback } from "react";
import {
  useMessageRuntime,
  useMessageUtilsStore,
} from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { useComposerRuntime } from "../../context";

export type UseActionBarCopyProps = {
  copiedDuration?: number | undefined;
};

export const useActionBarCopy = ({
  copiedDuration = 3000,
}: UseActionBarCopyProps = {}) => {
  const messageRuntime = useMessageRuntime();
  const composerRuntime = useComposerRuntime();
  const messageUtilsStore = useMessageUtilsStore();
  const hasCopyableContent = useCombinedStore(
    [messageRuntime, composerRuntime],
    (message, c) => {
      return (
        !c.isEditing &&
        (message.role !== "assistant" || message.status.type !== "running") &&
        message.content.some((c) => c.type === "text" && c.text.length > 0)
      );
    },
  );

  const callback = useCallback(() => {
    const message = messageRuntime.getState();
    const { setIsCopied } = messageUtilsStore.getState();
    const { isEditing, text: composerValue } = composerRuntime.getState();

    const valueToCopy = isEditing
      ? composerValue
      : getThreadMessageText(message);

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  }, [messageRuntime, messageUtilsStore, composerRuntime, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};
