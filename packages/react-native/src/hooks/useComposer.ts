import type { ThreadComposerState } from "@assistant-ui/core";
import { useComposerRuntime } from "../context";
import { useRuntimeState } from "./useRuntimeState";

export function useComposer(): ThreadComposerState;
export function useComposer<TSelected>(
  selector: (state: ThreadComposerState) => TSelected,
): TSelected;
export function useComposer<TSelected = ThreadComposerState>(
  selector?: (state: ThreadComposerState) => TSelected,
): TSelected {
  const runtime = useComposerRuntime();
  return useRuntimeState(
    runtime,
    selector as (state: ThreadComposerState) => TSelected,
  );
}
