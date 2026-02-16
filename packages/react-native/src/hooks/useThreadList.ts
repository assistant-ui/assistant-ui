import type { ThreadListState } from "@assistant-ui/core";
import { useAssistantRuntime } from "../context";
import { useRuntimeState } from "./useRuntimeState";

export function useThreadList(): ThreadListState;
export function useThreadList<TSelected>(
  selector: (state: ThreadListState) => TSelected,
): TSelected;
export function useThreadList<TSelected = ThreadListState>(
  selector?: (state: ThreadListState) => TSelected,
): TSelected {
  const runtime = useAssistantRuntime();
  return useRuntimeState(
    runtime.threads,
    selector as (state: ThreadListState) => TSelected,
  );
}
