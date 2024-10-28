"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListItemRuntime } from "../../context/react/ThreadListItemContext";

const useThreadListItemArchive = () => {
  const runtime = useThreadListItemRuntime();
  return () => {
    runtime.archive();
  };
};

export namespace ThreadListItemPrimitiveArchive {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListItemArchive>;
}

export const ThreadListItemPrimitiveArchive = createActionButton(
  "ThreadListItemPrimitive.Archive",
  useThreadListItemArchive,
);
