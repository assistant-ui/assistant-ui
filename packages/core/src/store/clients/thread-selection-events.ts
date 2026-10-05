import { useEffect, useRef } from "react";
import { useAssistantEmit } from "@assistant-ui/store/client";

/**
 * Emits `threads.selectionChanged` whenever the main thread selection changes.
 * Does not emit for the initially selected thread on mount. Every `threads`
 * client whose selection can change calls this with its current main thread id.
 */
export const useThreadSelectionEvents = (mainThreadId: string) => {
  const emit = useAssistantEmit();
  const previousMainThreadIdRef = useRef(mainThreadId);
  useEffect(() => {
    const previousThreadId = previousMainThreadIdRef.current;
    if (previousThreadId === mainThreadId) return;
    previousMainThreadIdRef.current = mainThreadId;
    emit("threads.selectionChanged", {
      threadId: mainThreadId,
      previousThreadId,
    });
  }, [mainThreadId, emit]);
};

/**
 * Emits `threadListItem.switchedTo` or `threadListItem.switchedAway` from a
 * thread list item's own scope when its thread gains or loses the main
 * selection. Emitting after the commit delivers against the rebound derived
 * scopes; a synchronous notification would reach the pre-switch binding.
 * `wasMain` is whether the thread held the selection before this item
 * mounted, so an item created and selected in one update reports the switch.
 */
export const useThreadListItemSelectionEvents = (
  threadId: string,
  isMain: boolean,
  wasMain = isMain,
) => {
  const emit = useAssistantEmit();
  const selectionRef = useRef({ isMain: isMain && wasMain, threadId });
  useEffect(() => {
    const previous = selectionRef.current;
    if (previous.isMain === isMain && previous.threadId === threadId) return;
    selectionRef.current = { isMain, threadId };
    emit(isMain ? "threadListItem.switchedTo" : "threadListItem.switchedAway", {
      threadId,
    });
  }, [isMain, threadId, emit]);
};
