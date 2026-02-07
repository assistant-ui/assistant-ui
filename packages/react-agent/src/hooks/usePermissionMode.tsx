"use client";

import { useCallback } from "react";
import { useTask } from "./useTaskState";
import type { PermissionMode } from "../runtime";

export function usePermissionMode(): PermissionMode {
  const taskRuntime = useTask();
  return taskRuntime.getPermissionMode() || "ask-all";
}

export function useSetPermissionMode(): (mode: PermissionMode) => void {
  const taskRuntime = useTask();
  return useCallback(
    (mode: PermissionMode) => {
      taskRuntime.setPermissionMode(mode);
    },
    [taskRuntime],
  );
}
