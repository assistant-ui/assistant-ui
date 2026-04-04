import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ModelContext } from "../../model-context/types";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { RunConfig } from "../../types/message";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../utils/chat-model-adapter";
import type { ExportedMessageRepository } from "../utils/message-repository";
import type { ThreadMessageLike } from "../utils/thread-message-like";
import type {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./composer-runtime-core";

export type RuntimeCapabilities = {
  readonly switchToBranch: boolean;
  readonly switchBranchDuringRun: boolean;
  readonly edit: boolean;
  readonly reload: boolean;
  readonly cancel: boolean;
  readonly unstable_copy: boolean;
  readonly speech: boolean;
  readonly dictation: boolean;
  readonly voice: boolean;
  readonly attachments: boolean;
  readonly feedback: boolean;
  readonly queue: boolean;
};

export type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError: boolean;
  artifact?: ReadonlyJSONValue | undefined;
};

export type ResumeToolCallOptions = {
  toolCallId: string;
  payload: unknown;
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

export type VoiceSessionState = {
  readonly status: RealtimeVoiceAdapter.Status;
  readonly isMuted: boolean;
  readonly mode: RealtimeVoiceAdapter.Mode;
};

export type SubmittedFeedback = {
  readonly type: "negative" | "positive";
};

export type ThreadRuntimeEventType =
  | "runStart"
  | "runEnd"
  | "initialize"
  | "modelContextUpdate";

export type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

export type ResumeRunConfig = StartRunConfig & {
  stream?: (
    options: ChatModelRunOptions,
  ) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

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

  connectVoice: () => void;
  disconnectVoice: () => void;
  muteVoice: () => void;
  unmuteVoice: () => void;

  submitFeedback: (feedback: SubmitFeedbackOptions) => void;

  getModelContext: () => ModelContext;

  composer: ThreadComposerRuntimeCore;
  getEditComposer: (messageId: string) => ComposerRuntimeCore | undefined;
  beginEdit: (messageId: string) => void;

  speech: SpeechState | undefined;
  voice: VoiceSessionState | undefined;

  capabilities: Readonly<RuntimeCapabilities>;
  isDisabled: boolean;
  isLoading: boolean;
  messages: readonly ThreadMessage[];
  state: ReadonlyJSONValue;
  suggestions: readonly ThreadSuggestion[];

  extras: unknown;

  subscribe: (callback: () => void) => Unsubscribe;

  getVoiceVolume: () => number;
  subscribeVoiceVolume: (callback: () => void) => Unsubscribe;

  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;

  exportExternalState(): any;
  importExternalState(state: any): void;

  reset(initialMessages?: readonly ThreadMessageLike[]): void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;

  /**
   * @deprecated Use importExternalState instead. This method will be removed in 0.12.0.
   */
  unstable_loadExternalState: (state: any) => void;
}>;
