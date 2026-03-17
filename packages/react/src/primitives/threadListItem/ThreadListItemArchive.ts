"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemArchive as useThreadListItemArchiveBehavior } from "@assistant-ui/core/react";

const useThreadListItemArchive = () => {
  const { archive } = useThreadListItemArchiveBehavior();
  return archive;
};

export namespace ThreadListItemPrimitiveArchive {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemArchive>;
}

export const ThreadListItemPrimitiveArchive = createActionButton(
  "ThreadListItemPrimitive.Archive",
  useThreadListItemArchive,
);
