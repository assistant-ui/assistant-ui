"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemUnarchive as useThreadListItemUnarchiveBehavior } from "@assistant-ui/core/react";

const useThreadListItemUnarchive = () => {
  const { unarchive } = useThreadListItemUnarchiveBehavior();
  return unarchive;
};

export namespace ThreadListItemPrimitiveUnarchive {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemUnarchive>;
}

export const ThreadListItemPrimitiveUnarchive = createActionButton(
  "ThreadListItemPrimitive.Unarchive",
  useThreadListItemUnarchive,
);
