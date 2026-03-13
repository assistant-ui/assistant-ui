"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemDelete as useThreadListItemDeleteBehavior } from "@assistant-ui/core/react";

const useThreadListItemDelete = () => {
  const { delete: deleteThread } = useThreadListItemDeleteBehavior();
  return deleteThread;
};

export namespace ThreadListItemPrimitiveDelete {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemDelete>;
}

export const ThreadListItemPrimitiveDelete = createActionButton(
  "ThreadListItemPrimitive.Delete",
  useThreadListItemDelete,
);
