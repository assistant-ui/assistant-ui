"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantApi } from "../../context";

const useThreadListItemDelete = () => {
  const api = useAssistantApi();
  return () => {
    api.threadListItem().delete();
  };
};

export namespace ThreadListItemPrimitiveDelete {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemDelete>;
}

export const ThreadListItemPrimitiveDelete = createActionButton(
  "ThreadListItemPrimitive.Delete",
  useThreadListItemDelete,
);
