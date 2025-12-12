import type {
  ReadonlyJSONValue,
  AppendMessage,
  ThreadMessage,
  Unsubscribe,
  ExportedMessageRepository,
  ThreadMessageLike,
  RuntimeCapabilities,
  SpeechState,
  SubmittedFeedback,
  AddToolResultOptions,
  ResumeToolCallOptions,
  SubmitFeedbackOptions,
  StartRunConfig,
  ResumeRunConfig,
} from "@assistant-ui/core";
import { ModelContext } from "../../../model-context";
import {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./ComposerRuntimeCore";

export type {
  RuntimeCapabilities,
  SpeechState,
  SubmittedFeedback,
  AddToolResultOptions,
  ResumeToolCallOptions,
  SubmitFeedbackOptions,
  StartRunConfig,
  ResumeRunConfig,
};

export type ThreadSuggestion = {
  prompt: string;
};

export type ThreadRuntimeEventType =
  | "run-start"
  | "run-end"
  | "initialize"
  | "model-context-update";

export type ThreadRuntimeCore = Readonly<{
  getMessageById: (messageId: string) =>
    | {
        parentId: string | null;
        message: ThreadMessage;
        index: number;
      }
    | undefined;

  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;

  append: (message: AppendMessage) => void;
  startRun: (config: StartRunConfig) => void;
  resumeRun: (config: ResumeRunConfig) => void;
  cancelRun: () => void;

  addToolResult: (options: AddToolResultOptions) => void;
  resumeToolCall: (options: ResumeToolCallOptions) => void;

  speak: (messageId: string) => void;
  stopSpeaking: () => void;

  submitFeedback: (feedback: SubmitFeedbackOptions) => void;

  getModelContext: () => ModelContext;

  composer: ThreadComposerRuntimeCore;
  getEditComposer: (messageId: string) => ComposerRuntimeCore | undefined;
  beginEdit: (messageId: string) => void;

  speech: SpeechState | undefined;

  capabilities: Readonly<RuntimeCapabilities>;
  isDisabled: boolean;
  isLoading: boolean;
  messages: readonly ThreadMessage[];
  state: ReadonlyJSONValue;
  suggestions: readonly ThreadSuggestion[];

  // TODO deprecate for a more elegant solution
  // /**
  //  * @deprecated This field is deprecated and will be removed in 0.12.0.
  //  * Please migrate to using `AssistantRuntimeCore.Provider` instead.
  //  */
  extras: unknown;

  subscribe: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;

  reset(initialMessages?: readonly ThreadMessageLike[]): void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
  unstable_loadExternalState: (state: any) => void;
}>;
