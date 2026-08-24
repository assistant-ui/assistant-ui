import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type {
  RuntimeCapabilities,
  SpeechState,
  VoiceSessionState,
  ThreadSuggestion,
} from "../../runtime/interfaces/thread-runtime-core";
import type { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type {
  CreateAppendMessage,
  CreateStartRunConfig,
  CreateResumeRunConfig,
  ThreadRuntime,
} from "../../runtime/api/thread-runtime";
import type { ModelContext } from "../../model-context/types";
import type { MessageMethods, MessageState } from "./message";
import type { ComposerMethods, ComposerState } from "./composer";
import type { SuggestionsMethods } from "./suggestions";

export type ThreadState = {
  /**
   * Whether the thread is empty. A thread is considered empty when it has no messages and is not loading.
   */
  readonly isEmpty: boolean;
  /**
   * Whether the thread is disabled. Disabled threads cannot receive new messages.
   */
  readonly isDisabled: boolean;
  /**
   * Whether the thread is loading its history.
   */
  readonly isLoading: boolean;
  /**
   * Whether the thread is running. A thread is considered running when there is an active stream connection to the backend.
   */
  readonly isRunning: boolean;
  /**
   * The capabilities of the thread, such as whether the thread supports editing, branch switching, etc.
   */
  readonly capabilities: RuntimeCapabilities;
  /**
   * The messages in the currently selected branch of the thread.
   */
  readonly messages: readonly MessageState[];
  /**
   * The thread state.
   * @deprecated This feature is experimental
   */
  readonly state: ReadonlyJSONValue;
  /**
   * Follow up message suggestions to show the user.
   */
  readonly suggestions: readonly ThreadSuggestion[];
  /**
   * Custom extra information provided by the runtime.
   */
  readonly extras: unknown;
  /** @deprecated This API is still under active development and might change without notice. */
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
  readonly composer: ComposerState;
};

export type ThreadMethods = {
  /**
   * Get the current state of the thread.
   */
  getState(): ThreadState;
  /**
   * The thread composer runtime.
   */
  composer(): ComposerMethods;
  /**
   * The suggestions shown for this thread.
   */
  suggestions(): SuggestionsMethods;
  /**
   * Append a new message to the thread.
   *
   * @example ```ts
   * // append a new user message with the text "Hello, world!"
   * threadRuntime.append("Hello, world!");
   * ```
   *
   * @example ```ts
   * // append a new assistant message with the text "Hello, world!"
   * threadRuntime.append({
   *   role: "assistant",
   *   content: [{ type: "text", text: "Hello, world!" }],
   * });
   * ```
   */
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  /**
   * Start a new run with the given configuration.
   * @param config The configuration for starting the run
   */
  startRun(config: CreateStartRunConfig): void;
  /**
   * Resume a run with the given configuration.
   * @param config The configuration for resuming the run
   */
  resumeRun(config: CreateResumeRunConfig): void;
  cancelRun(): void;
  /**
   * Re-fetch this thread's state from its backing store, in place: the tap
   * thread's refetch hook, which `threads.reloadMainThread()` prefers and
   * whose rejection it propagates. `capabilities.refetchThread` is the
   * portable feature-detection signal; a legacy-bridged thread reports it
   * there while routing the refetch through its runtime, not this method.
   * The method-shorthand optionality is load-bearing: an explicit
   * `| undefined` stops `ThreadMethods` satisfying `ClientMethods` and
   * collapses the client schema, which only a workspace-level app typecheck
   * surfaces.
   */
  unstable_refetchThread?(): Promise<void>;
  getModelContext(): ModelContext;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  /**
   * Reset the thread with optional initial messages.
   * @param initialMessages - Optional array of initial messages to populate the thread
   */
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  importExternalState(state: unknown): void;
  message(selector: { id: string } | { index: number }): MessageMethods;
  /** @deprecated This API is still under active development and might change without notice. */
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe;
  muteVoice(): void;
  unmuteVoice(): void;
  __internal_getRuntime?(): ThreadRuntime;
};

export type ThreadMeta = {
  source: "threads";
  query: { type: "main" };
};

export type ThreadEvents = {
  /**
   * A run started on this thread. Also observable as `isRunning` flipping to
   * `true` in thread state.
   */
  "thread.runStart": { threadId: string };
  /**
   * A run on this thread ended, whether it completed, errored, or was
   * cancelled. Also observable as `isRunning` flipping to `false` in thread
   * state.
   */
  "thread.runEnd": { threadId: string };
  /**
   * The thread transitioned from new to initialized. Fires before the first
   * message is added, so read thread state via `useAuiState` rather than
   * inside this event handler.
   */
  "thread.initialize": { threadId: string };
  /**
   * Truly transient. Model context lives in a provider, not in thread state,
   * so this event has no state-derivable equivalent.
   */
  "thread.modelContextUpdate": { threadId: string };
};

export type ThreadClientSchema = {
  methods: ThreadMethods;
  meta: ThreadMeta;
  events: ThreadEvents;
};
