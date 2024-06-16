import type { MutableRefObject } from "react";
import { create } from "zustand";
import type { AppendMessage, ThreadMessage } from "../../utils/AssistantTypes";

export type ThreadState = {
  messages: readonly ThreadMessage[];
  isRunning: boolean;

  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;
};

export const makeThreadStore = (runtimeRef: MutableRefObject<ThreadState>) => {
  const useThread = create<ThreadState>(() => ({
    messages: runtimeRef.current.messages,
    isRunning: runtimeRef.current.isRunning,
    getBranches: (messageId) => runtimeRef.current.getBranches(messageId),
    switchToBranch: (branchId) => runtimeRef.current.switchToBranch(branchId),
    startRun: (parentId) => runtimeRef.current.startRun(parentId),
    append: (message) => runtimeRef.current.append(message),
    cancelRun: () => runtimeRef.current.cancelRun(),
  }));

  const onRuntimeUpdate = () => {
    useThread.setState({
      messages: runtimeRef.current.messages,
      isRunning: runtimeRef.current.isRunning,
    });
  };

  return {
    useThread,
    onRuntimeUpdate,
  };
};
