import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadRuntimeEventType } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadRuntime } from "../../runtime/api/thread-runtime";
import { useMemo, useEffect, RefObject } from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useAssistantEmit,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store";
import { ComposerClient } from "./composer-runtime-client";
import { MessageClient } from "./message-runtime-client";
import { useSubscribable } from "./useSubscribable";
import type { ThreadState } from "../scopes/thread";

const useMessageClientById = ({
  runtime,
  id,
  threadIdRef,
}: {
  runtime: ThreadRuntime;
  id: string;
  threadIdRef: RefObject<string>;
}) => {
  const messageRuntime = useMemo(
    () => runtime.getMessageById(id),
    [runtime, id],
  );

  return useResource(MessageClient({ runtime: messageRuntime, threadIdRef }));
};

const MessageClientById = resource(useMessageClientById);

const useThreadClient = ({
  runtime,
}: {
  runtime: ThreadRuntime;
}): ClientOutput<"thread"> => {
  const runtimeState = useSubscribable(runtime);
  const emit = useAssistantEmit();

  useEffect(() => {
    const unsubscribers: Unsubscribe[] = [];

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

  const threadIdRef = useMemo(
    () => ({
      get current() {
        return runtime.getState()!.threadId;
      },
    }),
    [runtime],
  );

  const composer = useClientResource(
    ComposerClient({
      runtime: runtime.composer,
      threadIdRef,
    }),
  );
  const messages = useClientLookup(
    () =>
      runtimeState.messages.map((m) =>
        withKey(m.id, MessageClientById({ runtime, id: m.id, threadIdRef })),
      ),
    [runtimeState.messages, runtime, threadIdRef],
  );

  const state = useMemo<ThreadState>(() => {
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
      voice: runtimeState.voice,

      composer: composer.state,
      messages: messages.state,
    };
  }, [runtimeState, messages, composer.state]);

  return {
    getState: () => state,
    composer: () => composer.methods,
    append: runtime.append,
    deleteMessage: runtime.deleteMessage,
    startRun: runtime.startRun,
    resumeRun: runtime.resumeRun,
    cancelRun: runtime.cancelRun,
    getModelContext: runtime.getModelContext,
    export: runtime.export,
    import: runtime.import,
    reset: runtime.reset,
    stopSpeaking: runtime.stopSpeaking,
    connectVoice: runtime.connectVoice,
    disconnectVoice: runtime.disconnectVoice,
    getVoiceVolume: runtime.getVoiceVolume,
    subscribeVoiceVolume: runtime.subscribeVoiceVolume,
    muteVoice: runtime.muteVoice,
    unmuteVoice: runtime.unmuteVoice,
    message: (selector) => {
      if ("id" in selector) {
        return messages.get({ key: selector.id });
      } else {
        return messages.get(selector);
      }
    },
    __internal_getRuntime: () => runtime,
  };
};

export const ThreadClient = resource(useThreadClient);
