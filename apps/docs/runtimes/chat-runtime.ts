"use client";

import { useMemo } from "react";
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

// Speech and dictation adapters carry per-utterance state, so a surface keeps
// one instance rather than rebuilding them on every render.
export function useSpeechAdapters({ dictation = false } = {}) {
  return useMemo(
    () => ({
      speech: new WebSpeechSynthesisAdapter(),
      ...(dictation ? { dictation: new WebSpeechDictationAdapter() } : {}),
    }),
    [dictation],
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
