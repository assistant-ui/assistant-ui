import { AppendMessage, ModelConfig, ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./ComposerRuntimeCore";

export type RuntimeCapabilities = Readonly<{
  switchToBranch: boolean;
  edit: boolean;
  reload: boolean;
  cancel: boolean;
  unstable_copy: boolean;
  speech: boolean;
  attachments: boolean;
  feedback: boolean;
}>;

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

export type ThreadSuggestion = {
  prompt: string;
};

export type SpeechState = Readonly<{
  messageId: string;
  status: SpeechSynthesisAdapter.Status;
}>;

export type SubmittedFeedback = Readonly<{
  type: "negative" | "positive";
}>;

export type ThreadRuntimeEventType =
  | "switched-to"
  | "switched-away"
  | "run-start"
  | "model-config-update";

export type ThreadRuntimeCore = Readonly<{
  getMessageById: (messageId: string) =>
    | {
        parentId: string | null;
        message: ThreadMessage;
      }
    | undefined;

  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (parentId: string | null) => void;
  cancelRun: () => void;

  addToolResult: (options: AddToolResultOptions) => void;

  speak: (messageId: string) => void;
  stopSpeaking: () => void;

  getSubmittedFeedback: (messageId: string) => SubmittedFeedback | undefined;
  submitFeedback: (feedback: SubmitFeedbackOptions) => void;

  getModelConfig: () => ModelConfig;

  composer: ThreadComposerRuntimeCore;
  getEditComposer: (messageId: string) => ComposerRuntimeCore | undefined;
  beginEdit: (messageId: string) => void;

  speech: SpeechState | undefined;

  capabilities: Readonly<RuntimeCapabilities>;
  threadId: string;
  isDisabled: boolean;
  messages: readonly ThreadMessage[];
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;

  subscribe: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
}>;
