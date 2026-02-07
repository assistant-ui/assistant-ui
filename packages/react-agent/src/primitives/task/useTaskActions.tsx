"use client";

import { useCallback } from "react";
import { useTask, useTaskState } from "../../hooks";

export function useTaskCancel() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canCancel = ["starting", "running", "waiting_input"].includes(status);

  return canCancel ? useCallback(() => task.cancel(), [task]) : null;
}

export function useTaskRetry() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canRetry = status === "failed" || status === "completed";

  return canRetry ? useCallback(() => task.retry(), [task]) : null;
}
