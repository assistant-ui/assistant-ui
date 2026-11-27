"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  defineToolkit,
  Tools,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { WeatherCard } from "./weather-card";

// The server runs getWeather; the client only renders its call and result.
const toolkit = defineToolkit({
  getWeather: {
    type: "backend",
    display: "standalone",
    render: WeatherCard,
  },
});

export default function Home() {
  const runtime = useChatRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <main className="h-dvh">
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
}
