"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  WebSpeechDictationAdapter,
  useAui,
  useAuiEvent,
} from "@assistant-ui/react";
import { Codex } from "@/components/codex/codex";

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

export default function Home() {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/api/chat" }),
  );
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({ transport, adapters: { dictation } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatTitles />
      <Codex />
    </AssistantRuntimeProvider>
  );
}
