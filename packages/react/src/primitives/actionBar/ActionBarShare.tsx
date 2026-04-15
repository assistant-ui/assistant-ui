"use client";

import { forwardRef, useCallback } from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { SerializedThreadMessage } from "@assistant-ui/core";
import { serializeMessages } from "@assistant-ui/core";
import type { ActionButtonProps } from "../../utils/createActionButton";

const useActionBarShare = ({
  onShare,
  includeThread = false,
}: {
  onShare: (data: {
    message: SerializedThreadMessage;
    thread?: SerializedThreadMessage[];
  }) => void | Promise<void>;
  includeThread?: boolean;
}) => {
  const aui = useAui();
  const hasContent = useAuiState((s) => {
    return (
      (s.message.role !== "assistant" ||
        s.message.status?.type !== "running") &&
      s.message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(async () => {
    const message = aui.message().getState();
    const serialized = serializeMessages([message])[0]!;

    const data: {
      message: SerializedThreadMessage;
      thread?: SerializedThreadMessage[];
    } = { message: serialized };

    if (includeThread) {
      const threadMessages = aui.thread().getState().messages;
      data.thread = serializeMessages(threadMessages);
    }

    await onShare(data);
  }, [aui, onShare, includeThread]);

  if (!hasContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveShare {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarShare>;
}

export const ActionBarPrimitiveShare = forwardRef<
  ActionBarPrimitiveShare.Element,
  ActionBarPrimitiveShare.Props
>(({ onShare, includeThread, onClick, disabled, ...props }, forwardedRef) => {
  const callback = useActionBarShare({
    onShare,
    includeThread: includeThread ?? false,
  });
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        void callback?.();
      })}
    />
  );
});

ActionBarPrimitiveShare.displayName = "ActionBarPrimitive.Share";
