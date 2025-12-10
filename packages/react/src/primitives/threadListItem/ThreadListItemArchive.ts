"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantClient } from "@assistant-ui/store";
import { useCallback } from "react";

const useThreadListItemArchive = () => {
  const aui = useAssistantClient();
  return useCallback(() => {
    aui.threadListItem().archive();
  }, [aui]);
};

export namespace ThreadListItemPrimitiveArchive {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemArchive>;
}

export const ThreadListItemPrimitiveArchive = createActionButton(
  "ThreadListItemPrimitive.Archive",
  useThreadListItemArchive,
);
