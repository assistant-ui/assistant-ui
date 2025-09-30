import { ReadonlyJSONValue } from "assistant-stream/utils";
import { ComposerClientState, ComposerClientApi } from "./Composer";
import { MessageClientApi, MessageClientState } from "./Message";
import {
  CreateAppendMessage,
  CreateStartRunConfig,
  ThreadRuntime,
} from "../../legacy-runtime/runtime";
import {
  ThreadSuggestion,
  ExportedMessageRepository,
  ThreadMessageLike,
} from "../../legacy-runtime/runtime-cores";
import {
  RuntimeCapabilities,
  SpeechState,
} from "../../legacy-runtime/runtime-cores/core/ThreadRuntimeCore";
import { CreateResumeRunConfig } from "../../legacy-runtime/runtime/ThreadRuntime";
import { ModelContext } from "../../model-context";

export type ThreadClientState = {
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
  readonly messages: readonly MessageClientState[];

  /**
   * The thread state.
   *
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

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  readonly speech: SpeechState | undefined;

  readonly composer: ComposerClientState;
};

export type ThreadClientApi = {
  /**
   * Get the current state of the thread.
   */
  getState(): ThreadClientState;

  /**
   * The thread composer runtime.
   */
  readonly composer: ComposerClientApi;

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
   **/
  unstable_resumeRun(config: CreateResumeRunConfig): void;

  cancelRun(): void;
  getModelContext(): ModelContext;

  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;

  /**
   * Reset the thread with optional initial messages.
   *
   * @param initialMessages - Optional array of initial messages to populate the thread
   */
  reset(initialMessages?: readonly ThreadMessageLike[]): void;

  message(selector: { id: string } | { index: number }): MessageClientApi;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking(): void;

  /**
   * Start the voice session for the thread. Establishes any necessary media connections.
   */
  startVoice(): Promise<void>;

  /**
   * Stop the currently active voice session.
   */
  stopVoice(): Promise<void>;

  /** @internal */
  __internal_getRuntime?(): ThreadRuntime;
};
