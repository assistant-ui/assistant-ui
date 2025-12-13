import type { ReadonlyJSONValue } from "../stream/utils/json/json-value";
import type {
  AppendMessage,
  ThreadMessage,
  Unsubscribe,
  RuntimeCapabilities,
  SpeechState,
  SubmittedFeedback,
  AddToolResultOptions,
  ResumeToolCallOptions,
  SubmitFeedbackOptions,
  StartRunConfig,
  ResumeRunConfig,
} from "../types";
import type { ExportedMessageRepository } from "../runtime/MessageRepository";
import type { ThreadMessageLike } from "../runtime/external-store";
import type { ModelContext } from "../model-context";
import type {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./ComposerRuntimeCore";
import type { ThreadSuggestion } from "../adapters/SuggestionAdapter";

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

// Re-export from adapters
export type { ThreadSuggestion };

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
  extras: unknown;

  subscribe: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;

  reset(initialMessages?: readonly ThreadMessageLike[]): void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
  unstable_loadExternalState: (state: unknown) => void;
}>;
