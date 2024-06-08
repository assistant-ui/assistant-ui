"use client";

import { useCallback } from "react";
import { useAssistantContext } from "../utils/context/AssistantContext";

export const useCancelRun = () => {
  const { useThread } = useAssistantContext();
  const isRunning = useThread((s) => s.isRunning);

  if (!isRunning) return null;
  return useCallback(() => {
    const { cancelRun } = useThread.getState();
    cancelRun();
  }, [useThread]);
};
