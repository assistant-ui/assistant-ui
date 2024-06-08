import { useCallback } from "react";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { getMessageText } from "../utils/context/getMessageText";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const { useMessage, useComposer } = useMessageContext();

  const hasCopyableContent = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => {
      return c.isEditing || m.message.content.some((c) => c.type === "text");
    },
  );
  if (!hasCopyableContent) return null;

  return useCallback(() => {
    const { isEditing, value: composerValue } = useComposer.getState();
    const { message, setIsCopied } = useMessage.getState();

    const valueToCopy = isEditing ? composerValue : getMessageText(message);

    navigator.clipboard.writeText(valueToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  }, [useComposer, useMessage, copiedDuration]);
};
