import { useContentPartRuntime } from "./useContentPartRuntime";
import { useRuntimeState } from "./useRuntimeState";
import type { ContentPartRuntimeState } from "../context/ContentPartContext";

export function useContentPart(): ContentPartRuntimeState;
export function useContentPart<TSelected>(
  selector: (state: ContentPartRuntimeState) => TSelected,
): TSelected;
export function useContentPart(options: {
  optional?: false;
}): ContentPartRuntimeState;
export function useContentPart(options: {
  optional: true;
}): ContentPartRuntimeState | null;
export function useContentPart<TSelected>(options: {
  optional?: false;
  selector: (state: ContentPartRuntimeState) => TSelected;
}): TSelected;
export function useContentPart<TSelected>(options: {
  optional: true;
  selector: (state: ContentPartRuntimeState) => TSelected;
}): TSelected | null;
export function useContentPart<TSelected>(
  param?:
    | ((state: ContentPartRuntimeState) => TSelected)
    | {
        optional?: boolean;
        selector?: (state: ContentPartRuntimeState) => TSelected;
      },
): TSelected | ContentPartRuntimeState | null {
  let optional = false;
  let selector: ((state: ContentPartRuntimeState) => TSelected) | undefined;

  if (typeof param === "function") {
    selector = param;
  } else if (param) {
    optional = !!param.optional;
    selector = param.selector;
  }

  const runtime = useContentPartRuntime({ optional: optional as true });

  if (!runtime) return null;

  if (selector) {
    return useRuntimeState(runtime, selector);
  }
  return useRuntimeState(runtime);
}
