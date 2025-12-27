"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { GetWeatherToolUI, CompareWeatherToolUI } from "@/components/weather-tool-uis";

export default function Home() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <GetWeatherToolUI />
      <CompareWeatherToolUI />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <header className="p-4 border-b bg-white shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Weather Assistant
            </h1>
            <p className="text-sm text-slate-500">
              Ask about weather anywhere! Try: &quot;What&apos;s the weather in
              Tokyo?&quot;
            </p>
          </header>
          <div className="h-[calc(100vh-80px)]">
            <Thread />
          </div>
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
