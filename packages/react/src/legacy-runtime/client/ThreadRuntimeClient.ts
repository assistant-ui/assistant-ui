import { ThreadRuntimeEventType } from "../runtime-cores/core/ThreadRuntimeCore";
import { ThreadRuntime } from "../runtime/ThreadRuntime";
import {
  resource,
  tapResource,
  tapMemo,
  tapEffect,
  type tapRef,
  withKey,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapAssistantEmit,
  tapClientLookup,
  tapClientResource,
} from "@assistant-ui/store";
import { ComposerClient } from "./ComposerRuntimeClient";
import { MessageClient } from "./MessageRuntimeClient";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { Unsubscribe } from "../../types";
import { ThreadState } from "../../types/scopes";

const MessageClientById = resource(
  ({
    runtime,
    id,
    threadIdRef,
  }: {
    runtime: ThreadRuntime;
    id: string;
    threadIdRef: tapRef.RefObject<string>;
  }) => {
    const messageRuntime = tapMemo(
      () => runtime.getMessageById(id),
      [runtime, id],
    );

    return tapResource(MessageClient({ runtime: messageRuntime, threadIdRef }));
  },
);

export const ThreadClient = resource(
  ({ runtime }: { runtime: ThreadRuntime }): ClientOutput<"thread"> => {
    const runtimeState = tapSubscribable(runtime);
    const emit = tapAssistantEmit();

    // Bind thread events to event manager
    tapEffect(() => {
      const unsubscribers: Unsubscribe[] = [];

      // Subscribe to thread events
      const threadEvents: ThreadRuntimeEventType[] = [
        "runStart",
        "runEnd",
        "initialize",
        "modelContextUpdate",
      ];

      for (const event of threadEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          const threadId = runtime.getState()?.threadId || "unknown";
          emit(`thread.${event}`, {
            threadId,
          });
        });
        unsubscribers.push(unsubscribe);
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, emit]);

    const threadIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState()!.threadId;
        },
      }),
      [runtime],
    );

    const composer = tapClientResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef,
      }),
    );
    const messages = tapClientLookup(
      () =>
        runtimeState.messages.map((m) =>
          withKey(m.id, MessageClientById({ runtime, id: m.id, threadIdRef })),
        ),
      [runtimeState.messages, runtime, threadIdRef],
    );

    const state = tapMemo<ThreadState>(() => {
      return {
        isEmpty: messages.state.length === 0 && !runtimeState.isLoading,
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

    return {
      getState: () => state,
      composer: () => composer.methods,
      append: runtime.append,
      startRun: runtime.startRun,
      unstable_resumeRun: runtime.unstable_resumeRun,
      cancelRun: runtime.cancelRun,
      getModelContext: runtime.getModelContext,
      export: runtime.export,
      import: runtime.import,
      reset: runtime.reset,
      stopSpeaking: runtime.stopSpeaking,
      startVoice: async () => {
        throw new Error("startVoice is not supported in this runtime");
      },
      stopVoice: async () => {
        throw new Error("stopVoice is not supported in this runtime");
      },
      message: (selector) => {
        if ("id" in selector) {
          return messages.get({ key: selector.id });
        } else {
          return messages.get(selector);
        }
      },
      __internal_getRuntime: () => runtime,
    };
  },
);
