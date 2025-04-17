"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { Tools } from "@/lib/tools";
import { assistantUIToolBox } from "@assistant-ui/react/runtimes/core/ThreadRuntimeCore";

export const toolbox = assistantUIToolBox<Tools>();

const GetLocationFromUser = toolbox.getLocationFromUser.defineToolUI({
  render: (a) => {
    return (
      <button
        onClick={() => {
          a.addResult("Mumbai");
        }}
      >
        Answer Mumbai
      </button>
    );
  },
});

const Weather = toolbox.weather.defineToolUI({
  render: ({ result }) => {
    if (!result) {
      return null;
    }

    return (
      <div className="mx-auto flex max-w-sm items-center space-x-4 rounded-xl bg-white p-6 shadow-lg">
        <div className="shrink-0">
          {/* Weather icon - using a simple emoji as placeholder */}
          <span className="text-4xl">☀️</span>
        </div>
        <div>
          <div className="text-xl font-medium text-black">Weather Report</div>
          <p className="text-slate-500">
            The weather in{" "}
            <span className="font-semibold text-blue-600">
              {result.location}
            </span>{" "}
            is <span className="font-bold">{result.tempCelsius}°C</span>
          </p>
        </div>
      </div>
    );
  },
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chat = useChat({ api: "/api/chat", maxSteps: 5 });

  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <GetLocationFromUser />
      <Weather />
      {children}
    </AssistantRuntimeProvider>
  );
}
