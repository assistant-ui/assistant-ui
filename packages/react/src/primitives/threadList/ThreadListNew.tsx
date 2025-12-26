"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { forwardRef } from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useAssistantState, useAssistantClient } from "@assistant-ui/store";

export namespace ThreadListPrimitiveNew {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<() => void>;
}

export const ThreadListPrimitiveNew = forwardRef<
  ThreadListPrimitiveNew.Element,
  ThreadListPrimitiveNew.Props
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const isMain = useAssistantState(
    ({ threads }) => threads.newThreadId === threads.mainThreadId,
  );

  const aui = useAssistantClient();

  return (
    <Primitive.button
      type="button"
      {...(isMain ? { "data-active": "true", "aria-current": "true" } : null)}
      {...props}
      ref={forwardedRef}
      disabled={disabled}
      onClick={composeEventHandlers(onClick, () => {
        aui.threads().switchToNewThread();
      })}
    />
  );
});

ThreadListPrimitiveNew.displayName = "ThreadListPrimitive.New";
