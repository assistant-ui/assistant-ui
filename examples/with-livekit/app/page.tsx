"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { LiveKitVoiceAdapter } from "@/lib/livekit-voice-adapter";
import { VoiceThread } from "./voice-thread";

export default function Home() {
  const runtime = useChatRuntime({
    adapters: {
      voice: new LiveKitVoiceAdapter({
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880",
        token: async () => {
          const res = await fetch("/api/livekit-token", { method: "POST" });
          if (!res.ok) throw new Error("Failed to create a LiveKit session");
          const { token } = await res.json();
          return token;
        },
      }),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VoiceThread />
    </AssistantRuntimeProvider>
  );
}
