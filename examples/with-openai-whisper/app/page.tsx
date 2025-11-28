"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { OpenAIWhisperAdapter } from "@/lib/openai-whisper-adapter";

export default function Home() {
  const runtime = useChatRuntime({
    adapters: {
      speechRecognition: new OpenAIWhisperAdapter({
        transcribeEndpoint: "/api/transcribe",
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
