"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "./assistant-ui/thread";
import { GetWeatherToolUI, CompareWeatherToolUI } from "./weather-tool-uis";

export function Chat() {
  // useChatRuntime uses /api/chat by default with AssistantChatTransport
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Register tool UIs - these render when AI calls the corresponding tools */}
      <GetWeatherToolUI />
      <CompareWeatherToolUI />

      {/* Chat interface */}
      <div className="h-[calc(100vh-80px)]">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
