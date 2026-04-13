"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemTrigger as useThreadListItemTriggerBehavior } from "@assistant-ui/core/react";

const useThreadListItemTrigger = () => {
  const { switchTo } = useThreadListItemTriggerBehavior();
  return switchTo;
};

export namespace ThreadListItemPrimitiveTrigger {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemTrigger>;
}

export const ThreadListItemPrimitiveTrigger = createActionButton(
  "ThreadListItemPrimitive.Trigger",
  useThreadListItemTrigger,
);
