"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ElevenLabsScribeAdapter } from "@/lib/elevenlabs-scribe-adapter";

export default function Home() {
  const runtime = useChatRuntime({
    adapters: {
      speechRecognition: new ElevenLabsScribeAdapter({
        tokenEndpoint: "/api/scribe-token",
        languageCode: "en", // Change to your preferred language
      }),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
