import { ReadonlyJSONValue } from "assistant-stream/utils";
import {
  RuntimeCapabilities,
  SpeechState,
  ThreadRuntimeEventType,
  ThreadSuggestion,
} from "../runtimes/core/ThreadRuntimeCore";
import { CreateAppendMessage, CreateStartRunConfig } from "../api";
import { CreateResumeRunConfig, ThreadRuntime } from "../api/ThreadRuntime";
import {
  resource,
  tapInlineResource,
  tapMemo,
  tapResources,
  Unsubscribe,
} from "@assistant-ui/tap";
import { ModelContext } from "../model-context";
import { ExportedMessageRepository, ThreadMessageLike } from "../runtimes";
import {
  ComposerClient,
  ComposerClientActions,
  ComposerClientState,
} from "./ComposerClient";
import {
  MessageClient,
  MessageClientActions,
  MessageClientState,
} from "./MessageClient";
import { tapRefValue } from "./util-hooks/tapRefValue";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapActions } from "../utils/tap-store";

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

  message(
    messageIdOrOptions: string | { id: string } | { index: number }
  ): MessageClientActions;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking: () => void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
};

class MessageClientActionsImpl implements MessageClientActions {
  constructor(
    private readonly getRuntime: () => ReturnType<ThreadRuntime['getMesssageById']>,
    private readonly composerActions: ComposerClientActions,
    private readonly messageClients: Array<{ state: MessageClientState; actions: MessageClientActions }>
  ) {}

  get composer() {
    return this.composerActions;
  }

  speak() {
    this.getRuntime().speak();
  }

  stopSpeaking() {
    this.getRuntime().stopSpeaking();
  }

  submitFeedback(feedback: { type: "positive" | "negative" }) {
    this.getRuntime().submitFeedback(feedback);
  }

  switchToBranch(options: { position?: "previous" | "next"; branchId?: string }) {
    this.getRuntime().switchToBranch(options);
  }

  getCopyText() {
    return this.getRuntime().unstable_getCopyText();
  }

  toolCall(toolCallId: string) {
    return {
      addToolResult: this.getRuntime()
        .getMessagePartByToolCallId(toolCallId).addToolResult,
    };
  }

  part(partIdx: number) {
    const partRuntime = this.getRuntime()
      .getMessagePartByIndex(partIdx);
    return {
      addToolResult: partRuntime.addToolResult,
    };
  }

  attachment(attachmentIdx: number) {
    const attachmentRuntime = this.getRuntime()
      .getAttachmentByIndex(attachmentIdx);
    return {
      remove: attachmentRuntime.remove,
    };
  }

  reload(config?: { runConfig?: any }) {
    this.getRuntime().reload(config);
  }

  setIsCopied(value: boolean) {
    const messageId = this.getRuntime().getState().id;
    const client = this.messageClients.find((m) => m.state.id === messageId);
    if (client) {
      client.actions.setIsCopied(value);
    }
  }

  setIsHovering(value: boolean) {
    const messageId = this.getRuntime().getState().id;
    const client = this.messageClients.find((m) => m.state.id === messageId);
    if (client) {
      client.actions.setIsHovering(value);
    }
  }
}

const MessageClientAtIndex = resource(
  ({ runtime, index }: { runtime: ThreadRuntime; index: number }) => {
    const messageRuntime = tapMemo(
      () => runtime.getMesssageByIndex(index),
      [runtime, index],
    );

    return tapInlineResource(MessageClient({ runtime: messageRuntime }));
  },
);

export const ThreadClient = resource(
  ({ runtime }: { runtime: ThreadRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
      }),
    );

    const messageClients = tapResources(
      runtimeState.messages.map((m, idx) =>
        MessageClientAtIndex({ runtime: runtime, index: idx }, { key: m.id }),
      ),
    );

    const state = tapMemo<ThreadClientState>(() => {
      return {
        isDisabled: runtimeState.isDisabled,
        isLoading: runtimeState.isLoading,
        isRunning: runtimeState.isRunning,
        capabilities: runtimeState.capabilities,
        state: runtimeState.state,
        suggestions: runtimeState.suggestions,
        extras: runtimeState.extras,
        speech: runtimeState.speech,

        composer: composer.state,
        messages: messageClients.map((m) => m.state),
      };
    }, [runtimeState, messageClients]);

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

      message: (messageIdOrOptions) => {
        let getRuntime: () => ReturnType<ThreadRuntime['getMesssageById']>;
        
        if (typeof messageIdOrOptions === 'string') {
          // Direct messageId
          getRuntime = () => runtimeRef.current.getMesssageById(messageIdOrOptions);
        } else if ('id' in messageIdOrOptions) {
          // Object with id
          getRuntime = () => runtimeRef.current.getMesssageById(messageIdOrOptions.id);
        } else {
          // Object with index
          getRuntime = () => runtimeRef.current.getMesssageByIndex(messageIdOrOptions.index);
        }
        
        return new MessageClientActionsImpl(getRuntime, composer.actions, messageClients);
      },
    });

    return {
      state,
      actions,
    };
  },
);
