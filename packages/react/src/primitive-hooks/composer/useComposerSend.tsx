"use client";

import { useCallback } from "react";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useComposerRuntime } from "../../context";

export const useComposerSend = () => {
  const composerRuntime = useComposerRuntime();
  const threadRuntime = useThreadRuntime();

  const disabled = useCombinedStore(
    [threadRuntime, composerRuntime],
    (t, c) => t.isRunning || !c.isEditing || c.isEmpty,
  );

  const callback = useCallback(() => {
    if (!composerRuntime.getState().isEditing) return;

    composerRuntime.send();
  }, [threadRuntime]);

  if (disabled) return null;
  return callback;
};
