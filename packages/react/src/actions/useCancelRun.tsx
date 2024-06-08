"use client";

import { useCallback } from "react";
import { useAssistantContext } from "../utils/context/AssistantContext";

export const useCancelRun = () => {
  const { useThread } = useAssistantContext();
  const isRunning = useThread((s) => s.isRunning);

  const callback = useCallback(() => {
    const { cancelRun } = useThread.getState();
    cancelRun();
  }, [useThread]);

  if (!isRunning) return null;
  return callback;
};
