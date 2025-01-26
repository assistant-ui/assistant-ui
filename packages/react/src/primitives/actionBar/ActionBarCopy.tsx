"use client";

import { forwardRef } from "react";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useMessageUtils } from "../../context";
import { useCallback } from "react";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";
import { useComposerRuntime } from "../../context";

const useActionBarPrimitiveCopy = ({
  copiedDuration = 3000,
}: { copiedDuration?: number | undefined } = {}) => {
  const messageRuntime = useMessageRuntime();
  const composerRuntime = useComposerRuntime();
  const setIsCopied = useMessageUtils((s) => s.setIsCopied);
  const hasCopyableContent = useMessage((message) => {
    return (
      (message.role !== "assistant" || message.status.type !== "running") &&
      message.content.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(() => {
    const { isEditing, text: composerValue } = composerRuntime.getState();

    const valueToCopy = isEditing
      ? composerValue
      : messageRuntime.unstable_getCopyText();

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  }, [messageRuntime, setIsCopied, composerRuntime, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveCopy {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarPrimitiveCopy>;
}

export const ActionBarPrimitiveCopy = forwardRef<
  ActionBarPrimitiveCopy.Element,
  ActionBarPrimitiveCopy.Props
>(({ copiedDuration, onClick, disabled, ...props }, forwardedRef) => {
  const isCopied = useMessageUtils((u) => u.isCopied);
  const callback = useActionBarPrimitiveCopy({ copiedDuration });
  return (
    <Primitive.button
      type="button"
      {...(isCopied ? { "data-copied": "true" } : {})}
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveCopy.displayName = "ActionBarPrimitive.Copy";
