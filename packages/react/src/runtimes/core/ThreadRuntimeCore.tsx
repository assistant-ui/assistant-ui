import { AppendMessage, ModelConfig, ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./ComposerRuntimeCore";

export type RuntimeCapabilities = {
  readonly switchToBranch: boolean;
  readonly edit: boolean;
  readonly reload: boolean;
  readonly cancel: boolean;
  readonly unstable_copy: boolean;
  readonly speech: boolean;
  readonly attachments: boolean;
  readonly feedback: boolean;
};

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

export type SpeechState = {
  readonly messageId: string;
  readonly status: SpeechSynthesisAdapter.Status;
};

export type SubmittedFeedback = {
  readonly type: "negative" | "positive";
};

export type ThreadMetadata = Readonly<{
  readonly threadId: string;
  readonly state: "archived" | "regular" | "new" | "deleted";
  readonly title?: string | undefined;
}>;

export type ThreadRuntimeEventType =
  | "switched-to"
  | "switched-away"
  | "run-start"
  | "model-config-update";

export type ThreadMetadataRuntimeCore = ThreadMetadata & {
  create(title?: string): Promise<void>;
  rename(newTitle: string): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
};

export type ThreadRuntimeCore = Readonly<{
  metadata: ThreadMetadataRuntimeCore;

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
  isDisabled: boolean;
  messages: readonly ThreadMessage[];
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;

  subscribe: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
}>;
