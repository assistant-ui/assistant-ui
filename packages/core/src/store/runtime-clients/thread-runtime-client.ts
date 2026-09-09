import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadRuntimeEventType } from "../../runtime/interfaces/thread-runtime-core";
import type {
  CreateAppendMessage,
  ThreadRuntime,
} from "../../runtime/api/thread-runtime";
import {
  useMemo,
  useEffect,
  useEffectEvent,
  useCallback,
  type RefObject,
} from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import { liveRef } from "./liveRef";
import type { ClientOutput } from "@assistant-ui/store";
import {
  useAssistantEmit,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store/client";
import { ComposerClient } from "./composer-runtime-client";
import { MessageClient } from "./message-runtime-client";
import { ThreadSuggestions } from "../clients/suggestions";
import { useSubscribable } from "./useSubscribable";
import type { ThreadState } from "../scopes/thread";

const useMessageClientById = ({
  runtime,
  id,
  threadIdRef,
  threadId,
}: {
  runtime: ThreadRuntime;
  id: string;
  threadIdRef: RefObject<string>;
  threadId: string;
}) => {
  const messageRuntime = useMemo(
    () => runtime.getMessageById(id),
    [runtime, id],
  );

  return useResource(
    MessageClient({ runtime: messageRuntime, threadIdRef, threadId }),
  );
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
    () => liveRef(() => runtime.getState()!.threadId),
    [runtime],
  );
  const emitThreadEvent = useEffectEvent(
    (event: "thread.cancelRun" | "thread.voiceStarted") => {
      emit(event, { threadId: runtime.getState()!.threadId });
    },
  );
  const isSuggestion = useCallback(
    (text: string) =>
      runtime
        .getState()!
        .suggestions.some((suggestion) => suggestion.prompt === text),
    [runtime],
  );

  const composer = useClientResource(
    ComposerClient({
      runtime: runtime.composer,
      threadIdRef,
      isSuggestion,
    }),
  );
  const suggestions = useClientResource(
    ThreadSuggestions(runtimeState.suggestions),
  );
  const messages = useClientLookup(
    runtimeState.messages.map((m) =>
      withKey(
        m.id,
        MessageClientById({
          runtime,
          id: m.id,
          threadIdRef,
          threadId: runtimeState.threadId,
        }),
        [runtime, m.id, threadIdRef],
      ),
    ),
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
    suggestions: () => suggestions.methods,
    append: (message) => {
      const appended: Exclude<CreateAppendMessage, string> =
        typeof message === "string"
          ? { content: [{ type: "text", text: message }] }
          : message;
      if ((appended.role ?? "user") === "user") {
        const text = appended.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("");
        emit("composer.send", {
          threadId: runtime.getState()!.threadId,
          chars: text.length,
          attachments: appended.attachments?.length ?? 0,
          ...(isSuggestion(text) ? { suggestion: true } : undefined),
        });
      }
      runtime.append(message);
    },
    deleteMessage: runtime.deleteMessage,
    startRun: runtime.startRun,
    resumeRun: runtime.resumeRun,
    importExternalState: runtime.importExternalState,
    cancelRun: () => {
      if (runtimeState.isRunning) emitThreadEvent("thread.cancelRun");
      runtime.cancelRun();
    },
    getModelContext: runtime.getModelContext,
    export: runtime.export,
    import: runtime.import,
    reset: runtime.reset,
    stopSpeaking: runtime.stopSpeaking,
    connectVoice: () => {
      emitThreadEvent("thread.voiceStarted");
      runtime.connectVoice();
    },
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
