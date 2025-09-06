"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantApi } from "../../context";
import { useCallback } from "react";

const useThreadListItemTrigger = () => {
  const api = useAssistantApi();
  return useCallback(() => {
    api.threadListItem().switchTo();
  }, [api]);
};

export namespace ThreadListItemPrimitiveTrigger {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemTrigger>;
}

export const ThreadListItemPrimitiveTrigger = createActionButton(
  "ThreadListItemPrimitive.Trigger",
  useThreadListItemTrigger,
);
