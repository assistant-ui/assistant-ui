import { useComposerRuntime } from "./useComposerRuntime";
import { useRuntimeState } from "./useRuntimeState";
import type { ComposerRuntimeState } from "../context/ComposerContext";

export function useComposer(): ComposerRuntimeState;
export function useComposer<TSelected>(
  selector: (state: ComposerRuntimeState) => TSelected,
): TSelected;
export function useComposer(options: {
  optional?: false;
}): ComposerRuntimeState;
export function useComposer(options: {
  optional: true;
}): ComposerRuntimeState | null;
export function useComposer<TSelected>(options: {
  optional?: false;
  selector: (state: ComposerRuntimeState) => TSelected;
}): TSelected;
export function useComposer<TSelected>(options: {
  optional: true;
  selector: (state: ComposerRuntimeState) => TSelected;
}): TSelected | null;
export function useComposer<TSelected>(
  param?:
    | ((state: ComposerRuntimeState) => TSelected)
    | {
        optional?: boolean;
        selector?: (state: ComposerRuntimeState) => TSelected;
      },
): TSelected | ComposerRuntimeState | null {
  let optional = false;
  let selector: ((state: ComposerRuntimeState) => TSelected) | undefined;

  if (typeof param === "function") {
    selector = param;
  } else if (param) {
    optional = !!param.optional;
    selector = param.selector;
  }

  const runtime = useComposerRuntime({ optional: optional as true });

  if (!runtime) return null;

  if (selector) {
    return useRuntimeState(runtime, selector);
  }
  return useRuntimeState(runtime);
}
