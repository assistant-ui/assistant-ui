"use client";

import { forwardRef, useCallback } from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import type { SerializedThreadMessage } from "@assistant-ui/core";
import { serializeMessages } from "@assistant-ui/core";
import type { ComponentPropsWithoutRef } from "react";

const useThreadShare = ({
  onShare,
}: {
  onShare: (data: SerializedThreadMessage[]) => void | Promise<void>;
}) => {
  const aui = useAui();

  const callback = useCallback(async () => {
    const messages = aui.thread().getState().messages;
    const serialized = serializeMessages(messages);
    await onShare(serialized);
  }, [aui, onShare]);

  return callback;
};

export namespace ThreadPrimitiveShare {
  export type Element = HTMLButtonElement;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button> & {
    onShare: (data: SerializedThreadMessage[]) => void | Promise<void>;
  };
}

export const ThreadPrimitiveShare = forwardRef<
  ThreadPrimitiveShare.Element,
  ThreadPrimitiveShare.Props
>(({ onShare, onClick, disabled, ...props }, forwardedRef) => {
  const callback = useThreadShare({ onShare });
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={disabled}
      onClick={composeEventHandlers(onClick, () => {
        void callback();
      })}
    />
  );
});

ThreadPrimitiveShare.displayName = "ThreadPrimitive.Share";
