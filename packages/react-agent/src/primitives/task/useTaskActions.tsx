"use client";

import { useCallback } from "react";
import { useTask, useTaskState } from "../../hooks";

export function useTaskCancel() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canCancel = ["starting", "running", "waiting_input"].includes(status);
  const callback = useCallback(() => task.cancel(), [task]);

  return canCancel ? callback : null;
}

export function useTaskRetry() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canRetry = status === "failed" || status === "completed";
  const callback = useCallback(() => task.retry(), [task]);

  return canRetry ? callback : null;
}
