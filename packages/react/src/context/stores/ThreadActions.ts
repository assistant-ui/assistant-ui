import { create } from "zustand";
import type { AppendMessage } from "../../types/AssistantTypes";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";
import { SpeechSynthesisAdapter } from "../../runtimes/speech/SpeechAdapterTypes";

export type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: any;
};

export type SubmitFeedbackOptions = {
  messageId: string;
  type: "negative" | "positive";
};

export type ThreadActionsState = Readonly<{
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;

  addToolResult: (options: AddToolResultOptions) => void;

  speak: (messageId: string) => SpeechSynthesisAdapter.Utterance;

  submitFeedback: (feedback: SubmitFeedbackOptions) => void;
}>;

export const makeThreadActionStore = (
  runtimeStore: ReadonlyStore<ThreadRuntimeStore>,
) => {
  return create<ThreadActionsState>(() =>
    Object.freeze({
      getBranches: (messageId) =>
        runtimeStore.getState().getBranches(messageId),
      switchToBranch: (branchId) =>
        runtimeStore.getState().switchToBranch(branchId),

      startRun: (parentId) => runtimeStore.getState().startRun(parentId),
      append: (message) => runtimeStore.getState().append(message),
      cancelRun: () => runtimeStore.getState().cancelRun(),

      addToolResult: (options) =>
        runtimeStore.getState().addToolResult(options),

      speak: (messageId) => runtimeStore.getState().speak(messageId),

      submitFeedback: ({ messageId, type }) =>
        runtimeStore.getState().submitFeedback({ messageId, type }),
    }),
  );
};
