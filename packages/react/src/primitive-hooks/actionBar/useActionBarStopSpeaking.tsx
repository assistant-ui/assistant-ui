"use client";

import { useCallback } from "react";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";

export const useActionBarStopSpeaking = () => {
  const messageRuntime = useMessageRuntime();
  const isSpeaking = useMessage((u) => u.speech != null);

  const callback = useCallback(async () => {
    messageRuntime.stopSpeaking();
  }, [messageRuntime]);

  if (!isSpeaking) return null;

  return callback;
};
