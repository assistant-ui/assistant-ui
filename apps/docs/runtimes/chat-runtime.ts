"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AssistantCloud,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
  createSuggestionAdapter,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
  type UseChatRuntimeOptions,
} from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";

type Adapters = UseChatRuntimeOptions["adapters"];

export const followUpSuggestionAdapter = createSuggestionAdapter({
  count: 3,
  maxMessages: 6,
  instructions:
    "Prefer follow-ups that exercise a different capability than the last reply: a deeper question on the same topic, a request to visualize or diagram it, or a request to remember a preference. Keep each under 60 characters.",
  async complete({ prompt, signal }) {
    try {
      const response = await anonymousSessionFetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) return [];

      const body = (await response.json()) as { suggestions?: unknown };
      return Array.isArray(body.suggestions)
        ? body.suggestions.filter(
            (suggestion): suggestion is string =>
              typeof suggestion === "string",
          )
        : [];
    } catch {
      return [];
    }
  },
});

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
  searchDocs = false,
  countConversations = false,
}: {
  api?: string;
  cloud?: AssistantCloud;
  adapters?: Adapters;
  sendAutomatically?: boolean;
  searchDocs?: boolean;
  countConversations?: boolean;
} = {}) {
  return useChatRuntime({
    transport: new AssistantChatTransport({
      ...(api ? { api } : {}),
      ...(searchDocs || countConversations
        ? {
            body: {
              ...(searchDocs ? { searchDocs: true } : {}),
              ...(countConversations ? { countConversations: true } : {}),
            },
          }
        : {}),
      fetch: anonymousSessionFetch,
    }),
    ...(sendAutomatically
      ? { sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls }
      : {}),
    ...(adapters ? { adapters } : {}),
    ...(cloud ? { cloud } : {}),
  });
}
