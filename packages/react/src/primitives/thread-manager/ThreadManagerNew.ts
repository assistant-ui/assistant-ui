"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadScrollToBottom } from "../../primitive-hooks/thread/useThreadScrollToBottom";
import { useAssistantRuntime } from "../../context";

const useThreadManagerNew = () => {
  const runtime = useAssistantRuntime();
  return () => {
    runtime.switchToNewThread();
  };
};

export namespace ThreadManagerPrimitiveNew {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadScrollToBottom>;
}

export const ThreadManagerPrimitiveNew = createActionButton(
  "ThreadManagerPrimitive.New",
  useThreadManagerNew,
);
