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
  tapEffect,
  RefObject,
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
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapApi } from "../utils/tap-store";
import { tapLookupResources } from "./util-hooks/tapLookupResources";
import { StoreApi } from "../utils/tap-store/tap-store-api";
import { Unsubscribe } from "../types";
import { EventManagerActions } from "./EventManagerClient";

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
  readonly composer: StoreApi<ComposerClientState, ComposerClientActions>;

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
    selector: { id: string } | { index: number },
  ): StoreApi<MessageClientState, MessageClientActions>;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking(): void;

  __internal_getRuntime(): ThreadRuntime;
};

const MessageClientById = resource(
  ({
    runtime,
    id,
    events,
    threadIdRef,
  }: {
    runtime: ThreadRuntime;
    id: string;
    events: EventManagerActions;
    threadIdRef: RefObject<string>;
  }) => {
    const messageRuntime = tapMemo(
      () => runtime.getMessageById(id),
      [runtime, id],
    );

    return tapInlineResource(
      MessageClient({ runtime: messageRuntime, events, threadIdRef }),
    );
  },
);

export const ThreadClient = resource(
  ({
    runtime,
    events,
  }: {
    runtime: ThreadRuntime;
    events: EventManagerActions;
  }) => {
    const runtimeState = tapSubscribable(runtime);

    // Bind thread events to event manager
    tapEffect(() => {
      const unsubscribers: Unsubscribe[] = [];

      // Subscribe to thread events
      const threadEvents: ThreadRuntimeEventType[] = [
        "run-start",
        "run-end",
        "initialize",
        "model-context-update",
      ];

      for (const event of threadEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          const threadId = runtime.getState()?.threadId || "unknown";
          events.emit(`thread.${event}`, {
            threadId,
          });
        });
        unsubscribers.push(unsubscribe);
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, events]);

    const threadIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState()!.threadId;
        },
      }),
      [runtime],
    );

    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
        events,
        threadIdRef,
      }),
    );

    const messages = tapLookupResources(
      runtimeState.messages.map((m) =>
        MessageClientById(
          { runtime: runtime, id: m.id, events, threadIdRef },
          { key: m.id },
        ),
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
        messages: messages.state,
      };
    }, [runtimeState, messages, composer.state]);

    const api = tapApi<ThreadClientState, ThreadClientActions>(state, {
      composer: composer.api,

      append: runtime.append,
      startRun: runtime.startRun,
      unstable_resumeRun: runtime.unstable_resumeRun,
      cancelRun: runtime.cancelRun,
      getModelContext: runtime.getModelContext,
      export: runtime.export,
      import: runtime.import,
      reset: runtime.reset,
      stopSpeaking: runtime.stopSpeaking,

      message: (selector) => {
        if ("id" in selector) {
          return messages.api({ key: selector.id });
        } else {
          return messages.api(selector);
        }
      },

      __internal_getRuntime: () => runtime,
    });

    return {
      state,
      api,
    };
  },
);
