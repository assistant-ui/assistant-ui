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
  EditComposerRuntimeCore,
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

export type ThreadRuntimeEventPayload = {
  /**
   * @deprecated State-derivable. Observe `state.isRunning` flipping to `true`
   * via `subscribe` + `getState` instead. Note: this event fires at the
   * transition point and may run before the next subscriber notification.
   * Kept for backward compatibility.
   */
  runStart: Record<string, never>;
  /**
   * @deprecated State-derivable. Observe `state.isRunning` flipping to `false`
   * via `subscribe` + `getState` instead. Note: this event fires at the
   * transition point and may run before the next subscriber notification.
   * Kept for backward compatibility.
   */
  runEnd: Record<string, never>;
  /**
   * @deprecated State-derivable. This event fires at the initialization
   * transition immediately BEFORE the first message is added, so reading state
   * inside the handler still sees an empty thread; observe `state.messages`
   * becoming non-empty via a regular `subscribe` callback instead. Kept for
   * backward compatibility.
   */
  initialize: Record<string, never>;
  /**
   * Truly transient. The model context lives in a provider, not in thread
   * state, so this event has no state-derivable equivalent.
   */
  modelContextUpdate: Record<string, never>;
};

export type ThreadRuntimeEventType = keyof ThreadRuntimeEventPayload;

export type ThreadRuntimeEventCallback<E extends ThreadRuntimeEventType> = (
  payload: ThreadRuntimeEventPayload[E],
) => void;

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
  getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
  beginEdit: (messageId: string) => void;

  speech: SpeechState | undefined;
  voice: VoiceSessionState | undefined;

  capabilities: Readonly<RuntimeCapabilities>;
  isDisabled: boolean;
  isLoading: boolean;
  /**
   * Optional explicit thread-level running flag. When provided, takes
   * precedence over the last-message-status heuristic. When omitted, falls
   * back to the legacy behavior. External-store runtimes surface this via
   * `ExternalStoreAdapter.isRunning`.
   */
  isRunning?: boolean | undefined;
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

  /**
   * @deprecated This API is still under active development and might change without notice.
   * For state-derivable transitions, prefer `subscribe` + `getState`. This channel is the
   * escape hatch for transient occurrences not represented in state.
   */
  unstable_on<E extends ThreadRuntimeEventType>(
    event: E,
    callback: ThreadRuntimeEventCallback<E>,
  ): Unsubscribe;

  /**
   * @deprecated Use importExternalState instead. This method will be removed in 0.12.0.
   */
  unstable_loadExternalState: (state: any) => void;
}>;
