import type { MessageState } from "@assistant-ui/core";
import { useMessageRuntime } from "../context";
import { useRuntimeState } from "./useRuntimeState";

export function useMessage(): MessageState;
export function useMessage<TSelected>(
  selector: (state: MessageState) => TSelected,
): TSelected;
export function useMessage<TSelected = MessageState>(
  selector?: (state: MessageState) => TSelected,
): TSelected {
  const runtime = useMessageRuntime();
  return useRuntimeState(
    runtime,
    selector as (state: MessageState) => TSelected,
  );
}
