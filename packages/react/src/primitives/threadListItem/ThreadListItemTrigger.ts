"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantClient } from "@assistant-ui/store";
import { useCallback } from "react";

const useThreadListItemTrigger = () => {
  const aui = useAssistantClient();
  return useCallback(() => {
    aui.threadListItem().switchTo();
  }, [aui]);
};

export namespace ThreadListItemPrimitiveTrigger {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemTrigger>;
}

export const ThreadListItemPrimitiveTrigger = createActionButton(
  "ThreadListItemPrimitive.Trigger",
  useThreadListItemTrigger,
);
