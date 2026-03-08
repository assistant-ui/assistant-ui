import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type {
  RuntimeCapabilities,
  SpeechState,
  ThreadSuggestion,
  ExportedMessageRepository,
  ThreadMessageLike,
  CreateAppendMessage,
  CreateStartRunConfig,
  CreateResumeRunConfig,
  ThreadRuntime,
} from "../../runtime";
import type { ModelContext } from "../../model-context";
import type { MessageMethods, MessageState } from "./message";
import type { ComposerMethods, ComposerState } from "./composer";

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
  /**
   * Start a new run with the given configuration.
   * @param config The configuration for starting the run
   */
  startRun(config: CreateStartRunConfig): void;
  /**
   * Resume a run with the given configuration.
   * @param config The configuration for resuming the run
   */
  unstable_resumeRun(config: CreateResumeRunConfig): void;
  cancelRun(): void;
  getModelContext(): ModelContext;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  /**
   * Reset the thread with optional initial messages.
   * @param initialMessages - Optional array of initial messages to populate the thread
   */
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  message(selector: { id: string } | { index: number }): MessageMethods;
  /** @deprecated This API is still under active development and might change without notice. */
  stopSpeaking(): void;
  /**
   * Start the voice session for the thread. Establishes any necessary media connections.
   */
  startVoice(): Promise<void>;
  /**
   * Stop the currently active voice session.
   */
  stopVoice(): Promise<void>;
  __internal_getRuntime?(): ThreadRuntime;
};

export type ThreadMeta = {
  source: "threads";
  query: { type: "main" };
};

export type ThreadEvents = {
  "thread.runStart": { threadId: string };
  "thread.runEnd": { threadId: string };
  "thread.initialize": { threadId: string };
  "thread.modelContextUpdate": { threadId: string };
};

export type ThreadClientSchema = {
  methods: ThreadMethods;
  meta: ThreadMeta;
  events: ThreadEvents;
};
