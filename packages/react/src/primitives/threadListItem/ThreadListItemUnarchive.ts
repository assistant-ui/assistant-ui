"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantClient } from "@assistant-ui/store";
import { useCallback } from "react";

const useThreadListItemUnarchive = () => {
  const aui = useAssistantClient();
  return useCallback(() => {
    aui.threadListItem().unarchive();
  }, [aui]);
};

export namespace ThreadListItemPrimitiveUnarchive {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemUnarchive>;
}

export const ThreadListItemPrimitiveUnarchive = createActionButton(
  "ThreadListItemPrimitive.Unarchive",
  useThreadListItemUnarchive,
);
