"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AssistantCloud,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
  type UseChatRuntimeOptions,
} from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";

type Adapters = UseChatRuntimeOptions["adapters"];

export function useAnonymousCloud() {
  return useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        anonymous: true,
      }),
    [],
  );
}

const subscribeToNothing = () => () => {};
const dictationUnsupportedOnServer = () => false;

// The server snapshot reports no support, so hydration matches and the mic
// only appears in browsers that can listen.
const useDictationSupported = () =>
  useSyncExternalStore(
    subscribeToNothing,
    WebSpeechDictationAdapter.isSupported,
    dictationUnsupportedOnServer,
  );

// Speech and dictation adapters carry per-utterance state, so a surface keeps
// one instance rather than rebuilding them on every render.
export function useSpeechAdapters({ dictation = false } = {}) {
  const dictationSupported = useDictationSupported() && dictation;

  const speech = useMemo(() => new WebSpeechSynthesisAdapter(), []);
  const dictationAdapter = useMemo(
    () => (dictationSupported ? new WebSpeechDictationAdapter() : undefined),
    [dictationSupported],
  );

  return useMemo(
    () => ({
      speech,
      ...(dictationAdapter ? { dictation: dictationAdapter } : {}),
    }),
    [speech, dictationAdapter],
  );
}

export function useDocsChatRuntime({
  api,
  cloud,
  adapters,
  sendAutomatically = false,
}: {
  api?: string;
  cloud?: AssistantCloud;
  adapters?: Adapters;
  sendAutomatically?: boolean;
} = {}) {
  return useChatRuntime({
    transport: new AssistantChatTransport({
      ...(api ? { api } : {}),
      fetch: anonymousSessionFetch,
    }),
    ...(sendAutomatically
      ? { sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls }
      : {}),
    ...(adapters ? { adapters } : {}),
    ...(cloud ? { cloud } : {}),
  });
}
