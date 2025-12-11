import { useMessageRuntime } from "./useMessageRuntime";
import { useRuntimeState } from "./useRuntimeState";
import type { MessageRuntimeState } from "../context/MessageContext";

export function useMessage(): MessageRuntimeState;
export function useMessage<TSelected>(
  selector: (state: MessageRuntimeState) => TSelected,
): TSelected;
export function useMessage(options: { optional?: false }): MessageRuntimeState;
export function useMessage(options: {
  optional: true;
}): MessageRuntimeState | null;
export function useMessage<TSelected>(options: {
  optional?: false;
  selector: (state: MessageRuntimeState) => TSelected;
}): TSelected;
export function useMessage<TSelected>(options: {
  optional: true;
  selector: (state: MessageRuntimeState) => TSelected;
}): TSelected | null;
export function useMessage<TSelected>(
  param?:
    | ((state: MessageRuntimeState) => TSelected)
    | {
        optional?: boolean;
        selector?: (state: MessageRuntimeState) => TSelected;
      },
): TSelected | MessageRuntimeState | null {
  let optional = false;
  let selector: ((state: MessageRuntimeState) => TSelected) | undefined;

  if (typeof param === "function") {
    selector = param;
  } else if (param) {
    optional = !!param.optional;
    selector = param.selector;
  }

  const runtime = useMessageRuntime({ optional: optional as true });

  if (!runtime) return null;

  if (selector) {
    return useRuntimeState(runtime, selector);
  }
  return useRuntimeState(runtime);
}
