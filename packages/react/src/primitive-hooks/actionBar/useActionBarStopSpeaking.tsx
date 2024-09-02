import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";

export const useActionBarStopSpeaking = () => {
  const { useMessageUtils } = useMessageContext();

  const isSpeaking = useMessageUtils((u) => u.isSpeaking);

  const callback = useCallback(async () => {
    useMessageUtils.getState().stopSpeaking();
  }, [useMessageUtils]);

  if (!isSpeaking) return null;

  return callback;
};
