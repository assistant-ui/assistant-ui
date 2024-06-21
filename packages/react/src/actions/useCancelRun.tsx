"use client";

import { useCallback } from "react";
import { useThreadContext } from "../context/ThreadContext";

export const useCancelRun = () => {
  const { useThread, useThreadActions } = useThreadContext();
  const isRunning = useThread((s) => s.isRunning);

  const callback = useCallback(() => {
    const { cancelRun } = useThreadActions.getState();
    cancelRun();
  }, [useThreadActions]);

  if (!isRunning) return null;
  return callback;
};
