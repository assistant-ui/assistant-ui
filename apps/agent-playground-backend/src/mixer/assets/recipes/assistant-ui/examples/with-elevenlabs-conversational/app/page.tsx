"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ElevenLabsVoiceAdapter } from "@/lib/elevenlabs-voice-adapter";
import { VoiceThread } from "./voice-thread";

export default function Home() {
  const runtime = useChatRuntime({
    adapters: {
      voice: new ElevenLabsVoiceAdapter({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
      }),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VoiceThread />
    </AssistantRuntimeProvider>
  );
}
