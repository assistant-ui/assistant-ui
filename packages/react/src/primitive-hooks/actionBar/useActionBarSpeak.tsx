import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useThreadContext } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarSpeak = () => {
  const { useThreadActions } = useThreadContext();
  const { useMessage, useEditComposer, useMessageUtils } = useMessageContext();

  const hasSpeakableContent = useCombinedStore(
    [useMessage, useEditComposer],
    ({ message }, c) => {
      return (
        !c.isEditing &&
        (message.role !== "assistant" || message.status.type !== "running") &&
        message.content.some((c) => c.type === "text" && c.text.length > 0)
      );
    },
  );

  const callback = useCallback(async () => {
    const { message } = useMessage.getState();
    const utt = useThreadActions.getState().speak(message.id);
    useMessageUtils.getState().addUtterance(utt);
  }, [useThreadActions, useMessage, useMessageUtils]);

  if (!hasSpeakableContent) return null;
  return callback;
};
