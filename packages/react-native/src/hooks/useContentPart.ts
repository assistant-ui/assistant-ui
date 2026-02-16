import type { MessageState } from "@assistant-ui/core";
import { useMessageRuntime } from "../context";
import { useRuntimeState } from "./useRuntimeState";

export function useContentPart(index: number) {
  const runtime = useMessageRuntime();
  return useRuntimeState(
    runtime,
    (state: MessageState) => state.content[index],
  );
}
