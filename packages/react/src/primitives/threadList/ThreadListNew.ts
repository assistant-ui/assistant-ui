"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAssistantRuntime } from "../../context";

const useThreadListNew = () => {
  const runtime = useAssistantRuntime();
  return () => {
    runtime.switchToNewThread();
  };
};

export namespace ThreadListPrimitiveNew {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListNew>;
}

export const ThreadListPrimitiveNew = createActionButton(
  "ThreadListPrimitive.New",
  useThreadListNew,
);
