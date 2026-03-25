"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { PlanRuntime, PlanState } from "../runtime";
import { useTask } from "./useTaskState";

export function usePlan(): PlanRuntime | null {
  const task = useTask();
  return task.getPlan() ?? null;
}

const EMPTY_SUBSCRIBE = (_cb: () => void) => () => {};

export function usePlanState<T>(selector: (state: PlanState) => T): T | null {
  const task = useTask();

  const subscribe = useCallback(
    (callback: () => void) => {
      let planUnsubscribe =
        task.getPlan()?.subscribe(callback) ?? EMPTY_SUBSCRIBE(callback);
      const taskUnsubscribe = task.subscribe(() => {
        planUnsubscribe();
        planUnsubscribe =
          task.getPlan()?.subscribe(callback) ?? EMPTY_SUBSCRIBE(callback);
        callback();
      });

      return () => {
        planUnsubscribe();
        taskUnsubscribe();
      };
    },
    [task],
  );

  const getSnapshot = useCallback(() => {
    return task.getPlan()?.getState() ?? null;
  }, [task]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return state ? selector(state) : null;
}
