import { useEffect, useRef } from "react";
import { useAssistantEmit } from "@assistant-ui/store/client";

const useThreadSelectionEventsInternal = (mainThreadId: string) => {
  const emit = useAssistantEmit();
  const previousMainThreadIdRef = useRef(mainThreadId);
  const previousMainThreadId = previousMainThreadIdRef.current;
  useEffect(() => {
    const previousThreadId = previousMainThreadIdRef.current;
    if (previousThreadId === mainThreadId) return;
    previousMainThreadIdRef.current = mainThreadId;
    emit("threads.selectionChanged", {
      threadId: mainThreadId,
      previousThreadId,
    });
  }, [mainThreadId, emit]);

  return previousMainThreadId;
};

/**
 * Emits `threads.selectionChanged` whenever the main thread selection changes.
 * Does not emit for the initially selected thread on mount.
 */
export const useThreadSelectionEvents = (mainThreadId: string) => {
  useThreadSelectionEventsInternal(mainThreadId);
};

export const useThreadSelectionEventsWithPrevious = (mainThreadId: string) =>
  useThreadSelectionEventsInternal(mainThreadId);

export const useThreadListItemSelectionEvents = (
  threadId: string,
  isMain: boolean,
  wasMain: boolean,
) => {
  const emit = useAssistantEmit();
  const isMainRef = useRef(wasMain);
  useEffect(() => {
    const wasMain = isMainRef.current;
    if (isMain === wasMain) return;
    isMainRef.current = isMain;
    emit(isMain ? "threadListItem.switchedTo" : "threadListItem.switchedAway", {
      threadId,
    });
  }, [emit, isMain, threadId]);
};
