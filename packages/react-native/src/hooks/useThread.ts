import type { ThreadState } from "@assistant-ui/core";
import { useThreadRuntime } from "../context";
import { useRuntimeState } from "./useRuntimeState";

export function useThread(): ThreadState;
export function useThread<TSelected>(
  selector: (state: ThreadState) => TSelected,
): TSelected;
export function useThread<TSelected = ThreadState>(
  selector?: (state: ThreadState) => TSelected,
): TSelected {
  const runtime = useThreadRuntime();
  return useRuntimeState(
    runtime,
    selector as (state: ThreadState) => TSelected,
  );
}
