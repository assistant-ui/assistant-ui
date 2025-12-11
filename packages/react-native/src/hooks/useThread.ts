import { useThreadRuntime } from "./useThreadRuntime";
import { useRuntimeState } from "./useRuntimeState";
import type { ThreadRuntimeState } from "../context/ThreadContext";

export function useThread(): ThreadRuntimeState;
export function useThread<TSelected>(
  selector: (state: ThreadRuntimeState) => TSelected,
): TSelected;
export function useThread(options: { optional?: false }): ThreadRuntimeState;
export function useThread(options: {
  optional: true;
}): ThreadRuntimeState | null;
export function useThread<TSelected>(options: {
  optional?: false;
  selector: (state: ThreadRuntimeState) => TSelected;
}): TSelected;
export function useThread<TSelected>(options: {
  optional: true;
  selector: (state: ThreadRuntimeState) => TSelected;
}): TSelected | null;
export function useThread<TSelected>(
  param?:
    | ((state: ThreadRuntimeState) => TSelected)
    | {
        optional?: boolean;
        selector?: (state: ThreadRuntimeState) => TSelected;
      },
): TSelected | ThreadRuntimeState | null {
  let optional = false;
  let selector: ((state: ThreadRuntimeState) => TSelected) | undefined;

  if (typeof param === "function") {
    selector = param;
  } else if (param) {
    optional = !!param.optional;
    selector = param.selector;
  }

  const runtime = useThreadRuntime({ optional: optional as true });

  if (!runtime) return null;

  if (selector) {
    return useRuntimeState(runtime, selector);
  }
  return useRuntimeState(runtime);
}
