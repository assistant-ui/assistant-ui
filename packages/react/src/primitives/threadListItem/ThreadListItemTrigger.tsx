"use client";

import { forwardRef } from "react";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemTrigger as useThreadListItemTriggerBehavior } from "@assistant-ui/core/react";
import {
  ThreadListCollection,
  useThreadListItemFocus,
} from "../threadListFocusGroup";

const useThreadListItemTrigger = () => {
  const { switchTo } = useThreadListItemTriggerBehavior();
  return switchTo;
};

export namespace ThreadListItemPrimitiveTrigger {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemTrigger>;
}

const ThreadListItemTriggerButton = createActionButton(
  "ThreadListItemPrimitive.Trigger",
  useThreadListItemTrigger,
);

export const ThreadListItemPrimitiveTrigger = forwardRef<
  ThreadListItemPrimitiveTrigger.Element,
  ThreadListItemPrimitiveTrigger.Props
>((props, forwardedRef) => {
  const focus = useThreadListItemFocus();
  const ref = useComposedRefs(forwardedRef, focus?.triggerRef);

  return (
    <ThreadListCollection.ItemSlot scope={undefined}>
      <ThreadListItemTriggerButton {...props} ref={ref} />
    </ThreadListCollection.ItemSlot>
  );
});

ThreadListItemPrimitiveTrigger.displayName = "ThreadListItemPrimitive.Trigger";
