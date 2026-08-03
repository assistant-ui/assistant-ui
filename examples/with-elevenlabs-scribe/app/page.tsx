"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ElevenLabsScribeAdapter } from "@/lib/elevenlabs-scribe-adapter";

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
    suggestions: Suggestions([
      {
        title: "Try dictating a message",
        label: "using the microphone button",
        prompt: "Hello, I'm testing voice dictation!",
      },
      {
        title: "Write a short email",
        label: "by speaking naturally",
        prompt: "Help me draft a professional email to schedule a meeting.",
      },
    ]),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    adapters: {
      dictation: new ElevenLabsScribeAdapter({
        tokenEndpoint: "/api/scribe-token",
        languageCode: "en", // Change to your preferred language
      }),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <ThreadWithSuggestions />
      </div>
    </AssistantRuntimeProvider>
  );
}
