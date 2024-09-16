import { useCallback } from "react";
import {
  useMessageUtils,
  useMessageUtilsStore,
} from "../../context/react/MessageContext";

export const useActionBarStopSpeaking = () => {
  const messageUtilsStore = useMessageUtilsStore();
  const isSpeaking = useMessageUtils((u) => u.isSpeaking);

  const callback = useCallback(async () => {
    messageUtilsStore.getState().stopSpeaking();
  }, [messageUtilsStore]);

  if (!isSpeaking) return null;

  return callback;
};
