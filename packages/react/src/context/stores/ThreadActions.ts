import { create } from "zustand";
import type { AppendMessage } from "../../types/AssistantTypes";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

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
  runtimeStore: ReadonlyStore<ThreadRuntimeStore>,
) => {
  return create<ThreadActionsState>(() =>
    Object.freeze({
      get capabilities() {
        return runtimeStore.getState().capabilities;
      },
      getBranches: (messageId) =>
        runtimeStore.getState().getBranches(messageId),
      switchToBranch: (branchId) =>
        runtimeStore.getState().switchToBranch(branchId),
      startRun: (parentId) => runtimeStore.getState().startRun(parentId),
      append: (message) => runtimeStore.getState().append(message),
      cancelRun: () => runtimeStore.getState().cancelRun(),
      addToolResult: (options) =>
        runtimeStore.getState().addToolResult(options),
    }),
  );
};
