"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "react";

const useThreadListItemDelete = () => {
  const aui = useAui();
  return useCallback(() => {
    aui.threadListItem().delete();
  }, [aui]);
};

export namespace ThreadListItemPrimitiveDelete {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemDelete>;
}

export const ThreadListItemPrimitiveDelete = createActionButton(
  "ThreadListItemPrimitive.Delete",
  useThreadListItemDelete,
);
