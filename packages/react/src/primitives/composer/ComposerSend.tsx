"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
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
    composerRuntime.send();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace ComposerPrimitiveSend {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerSend>;
}

export const ComposerPrimitiveSend = createActionButton(
  "ComposerPrimitive.Send",
  useComposerSend,
);
