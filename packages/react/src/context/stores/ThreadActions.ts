import type { MutableRefObject } from "react";
import { create } from "zustand";
import type { AppendMessage } from "../../types/AssistantTypes";
import { ThreadRuntime } from "../../runtime";

export type ThreadActionsState = Readonly<{
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;

  addToolResult: (toolCallId: string, result: any) => void;
}>;

export const makeThreadActionStore = (
  runtimeRef: MutableRefObject<ThreadRuntime>,
) => {
  return create<ThreadActionsState>(() =>
    Object.freeze({
      getBranches: (messageId) => runtimeRef.current.getBranches(messageId),
      switchToBranch: (branchId) => runtimeRef.current.switchToBranch(branchId),
      startRun: (parentId) => runtimeRef.current.startRun(parentId),
      append: (message) => runtimeRef.current.append(message),
      cancelRun: () => runtimeRef.current.cancelRun(),
      addToolResult: (toolCallId, result) =>
        runtimeRef.current.addToolResult(toolCallId, result),
    }),
  );
};
