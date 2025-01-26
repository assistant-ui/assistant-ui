"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useMessageRuntime } from "../../context";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

const useActionBarReload = () => {
  const messageRuntime = useMessageRuntime();
  const threadRuntime = useThreadRuntime();

  const disabled = useCombinedStore(
    [threadRuntime, messageRuntime],
    (t, m) => t.isRunning || t.isDisabled || m.role !== "assistant",
  );

  const callback = useCallback(() => {
    messageRuntime.reload();
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace ActionBarPrimitiveReload {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarReload>;
}

export const ActionBarPrimitiveReload = createActionButton(
  "ActionBarPrimitive.Reload",
  useActionBarReload,
);
