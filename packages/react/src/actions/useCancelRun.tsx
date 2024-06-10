"use client";

import { useCallback } from "react";
import { useThreadContext } from "../context/ThreadContext";

export const useCancelRun = () => {
  const { useThread } = useThreadContext();
  const isRunning = useThread((s) => s.isRunning);

  const callback = useCallback(() => {
    const { cancelRun } = useThread.getState();
    cancelRun();
  }, [useThread]);

  if (!isRunning) return null;
  return callback;
};
