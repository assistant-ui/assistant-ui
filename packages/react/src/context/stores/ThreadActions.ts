import type { MutableRefObject } from "react";
import { create } from "zustand";
import type { AppendMessage } from "../../types/AssistantTypes";
import { ThreadRuntime } from "../../runtimes";

export type AddToolResultOptions = {
  messageId: string;
  toolCallId: string;
  result: any;
};

export type ThreadActionsState = Readonly<{
  capabilities: Readonly<{
    edit: boolean;
    reload: boolean;
    cancel: boolean;
    copy: boolean;
  }>;
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;

  addToolResult: (options: AddToolResultOptions) => void;
}>;

export const makeThreadActionStore = (
  runtimeRef: MutableRefObject<ThreadRuntime>,
) => {
  return create<ThreadActionsState>(() =>
    Object.freeze({
      get capabilities() {
        return runtimeRef.current.capabilities;
      },
      getBranches: (messageId) => runtimeRef.current.getBranches(messageId),
      switchToBranch: (branchId) => runtimeRef.current.switchToBranch(branchId),
      startRun: (parentId) => runtimeRef.current.startRun(parentId),
      append: (message) => runtimeRef.current.append(message),
      cancelRun: () => runtimeRef.current.cancelRun(),
      addToolResult: (options) => runtimeRef.current.addToolResult(options),
    }),
  );
};
