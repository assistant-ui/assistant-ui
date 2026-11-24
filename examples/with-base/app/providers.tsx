"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
  createSuggestionAdapter,
  useAui,
  useAuiEvent,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import { Base } from "@/components/base/base";

const subscribeToNothing = () => () => {};

/* Speech recognition is a browser feature, so the server renders without it. */
function useDictationAdapter() {
  const supported = useSyncExternalStore(
    subscribeToNothing,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
  return useMemo(
    () => (supported ? new WebSpeechDictationAdapter() : undefined),
    [supported],
  );
}

/*
 * Follow-up prompts are written by the model after each reply, through the
 * suggest route. A request that fails leaves the row empty.
 */
const suggestion = createSuggestionAdapter({
  complete: async ({ prompt, signal }) => {
    const response = await fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
      ...(signal && { signal }),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { suggestions?: string[] };
    return body.suggestions ?? [];
  },
});

/* A rating stays on its message in the page. Send it to your own store here. */
const feedback: FeedbackAdapter = { submit: () => {} };

const titleOf = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

/*
 * The chats live in memory and nothing names them, so a chat takes its title
 * from its first message once that message has been answered.
 */
function ChatTitles() {
  const aui = useAui();

  useAuiEvent("thread.runEnd", () => {
    const chat = aui.threads.item("main");
    if (chat.getState().title) return;
    const first = aui.thread
      .getState()
      .messages.find((message) => message.role === "user");
    const text = first?.content.find((part) => part.type === "text")?.text;
    if (text) chat.rename(titleOf(text));
  });

  return null;
}

/*
 * The runtime and the app's frame sit in the layout, above the pages, so the
 * chats and the sidebar stay as they are when the page changes.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/api/chat" }),
  );
  const dictation = useDictationAdapter();
  const [speech] = useState(() => new WebSpeechSynthesisAdapter());
  const runtime = useChatRuntime({
    transport,
    adapters: { dictation, speech, suggestion, feedback },
    unstable_enableMessageQueue: true,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatTitles />
      <Base>{children}</Base>
    </AssistantRuntimeProvider>
  );
}
