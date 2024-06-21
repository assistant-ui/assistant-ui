import { useCallback } from "react";
import { useMessageContext } from "../context/MessageContext";
import { useCombinedStore } from "../utils/combined/useCombinedStore";
import { getMessageText } from "../utils/getMessageText";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const { useMessage, useMessageUtils, useComposer } = useMessageContext();

  const hasCopyableContent = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => {
      return c.isEditing || m.message.content.some((c) => c.type === "text");
    },
  );

  const callback = useCallback(() => {
    const { message } = useMessage.getState();
    const { setIsCopied } = useMessageUtils.getState();
    const { isEditing, value: composerValue } = useComposer.getState();

    const valueToCopy = isEditing ? composerValue : getMessageText(message);

    navigator.clipboard.writeText(valueToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  }, [useMessage, useMessageUtils, useComposer, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};
