"use client";

import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  Suggestions,
  unstable_Interactables,
  useAui,
  WebSpeechDictationAdapter,
} from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Workspace } from "@/components/workspace";
import { apiKeyHeaders } from "@/lib/api-keys";
import { documentPersistence } from "@/lib/persistence";

function DocumentScopes() {
  const aui = useAui();
  const config = AuiConfig({
    unstable_interactables: unstable_Interactables({
      persistence: documentPersistence,
    }),
    suggestions: Suggestions([
      {
        title: "Tighten",
        label: "the introduction",
        prompt: "Tighten the introduction without losing any facts.",
      },
      {
        title: "Add a summary",
        label: "under the title",
        prompt:
          "Add a two-sentence summary of this page right under the title.",
      },
      {
        title: "Review it",
        label: "and leave comments",
        prompt:
          "Review the document and leave comments on the weakest passages. Do not change the text.",
      },
    ]),
  });

  return (
    <AuiProvider extends={aui} config={config}>
      <Workspace />
    </AuiProvider>
  );
}

const subscribeToNothing = () => () => {};

// Speech recognition is not in every browser and never on the server, so the
// server render and the first client render both go without it.
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

export default function Home() {
  const [transport] = useState(
    () =>
      new AssistantChatTransport({ api: "/api/chat", headers: apiKeyHeaders }),
  );
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters: { dictation },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DocumentScopes />
    </AssistantRuntimeProvider>
  );
}
