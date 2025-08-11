import { ReadonlyJSONValue } from "assistant-stream/utils";
import {
  RuntimeCapabilities,
  SpeechState,
  ThreadRuntimeEventType,
  ThreadSuggestion,
} from "../runtimes/core/ThreadRuntimeCore";
import { ThreadMessage } from "../types";
import { CreateAppendMessage, CreateStartRunConfig } from "../api";
import { CreateResumeRunConfig, ThreadRuntime } from "../api/ThreadRuntime";
import { resource, tapMemo, tapResource, Unsubscribe } from "@assistant-ui/tap";
import { ModelContext } from "../model-context";
import { ExportedMessageRepository, ThreadMessageLike } from "../runtimes";
import { ToolResponse } from "assistant-stream";
import {
  ComposerClient,
  ComposerClientActions,
  ComposerClientState,
} from "./ComposerClient";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapActions } from "@assistant-ui/react-core";

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
  readonly messages: readonly ThreadMessage[];

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

type ToolCallPartClientActions = {
  /**
   * Add tool result to a tool call message part that has no tool result yet.
   * This is useful when you are collecting a tool result via user input ("human tool calls").
   */
  addToolResult(result: any | ToolResponse<any>): void;
};

type MessageClientActions = {
  readonly composer: ComposerClientActions;

  readonly speak: () => void;
  readonly stopSpeaking: () => void;
  readonly submitFeedback: (feedback: {
    type: "positive" | "negative";
  }) => void;
  readonly switchToBranch: (options: {
    position?: "previous" | "next";
    branchId?: string;
  }) => void;
  readonly getCopyText: () => string;
  readonly toolCall: (toolCallId: string) => ToolCallPartClientActions;
};

export type ThreadClientActions = {
  /**
   * The thread composer runtime.
   */
  readonly composer: ComposerClientActions;

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

  message(messageId: string): MessageClientActions;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking: () => void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
};

export const ThreadClient = resource(
  ({ runtime }: { runtime: ThreadRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const composer = tapResource(
      ComposerClient({
        runtime: runtime.composer,
      }),
    );

    const state = tapMemo<ThreadClientState>(() => {
      return {
        isDisabled: runtimeState.isDisabled,
        isLoading: runtimeState.isLoading,
        isRunning: runtimeState.isRunning,
        capabilities: runtimeState.capabilities,
        messages: runtimeState.messages,
        state: runtimeState.state,
        suggestions: runtimeState.suggestions,
        extras: runtimeState.extras,
        speech: runtimeState.speech,

        composer: composer.state,
      };
    }, [runtimeState]);

    const actions = tapActions<ThreadClientActions>({
      composer: composer.actions,

      append: runtime.append,
      startRun: runtime.startRun,
      unstable_resumeRun: runtime.unstable_resumeRun,
      cancelRun: runtime.cancelRun,
      getModelContext: runtime.getModelContext,
      export: runtime.export,
      import: runtime.import,
      reset: runtime.reset,
      stopSpeaking: runtime.stopSpeaking,
      unstable_on: runtime.unstable_on,

      message: (messageId: string) => {
        return {
          composer: composer.actions,
          speak: runtimeRef.current.getMesssageById(messageId).speak,
          stopSpeaking:
            runtimeRef.current.getMesssageById(messageId).stopSpeaking,
          submitFeedback:
            runtimeRef.current.getMesssageById(messageId).submitFeedback,
          switchToBranch:
            runtimeRef.current.getMesssageById(messageId).switchToBranch,
          getCopyText:
            runtimeRef.current.getMesssageById(messageId).unstable_getCopyText,
          toolCall: (toolCallId: string) => {
            return {
              addToolResult: runtimeRef.current
                .getMesssageById(messageId)
                .getMessagePartByToolCallId(toolCallId).addToolResult,
            };
          },
        };
      },
    });

    return {
      state,
      actions,
    };
  },
);
