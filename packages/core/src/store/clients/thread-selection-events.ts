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
