"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { cn } from "@/lib/utils";
import { makeAssistantToolUI } from "@assistant-ui/react";

type WeatherArgs = {
  location: string;
  unit: "c" | "f";
};

type WeatherResult = {
  content: string;
};

const WeatherTool = makeAssistantToolUI<WeatherArgs, WeatherResult>({
  toolName: "get_weather",
  render: ({ args, result, status }) => {
    return (
      <p
        className={cn(
          "my-4 text-center font-mono text-sm font-bold text-blue-500 first:mt-0",
          status.type === "running" && "animate-pulse",
        )}
      >
        get_weather({JSON.stringify(args)})
        {!!result && <> =&gt; {JSON.stringify(result)}</>}
      </p>
    );
  },
});

export default function Home() {
  return (
    <main className="h-dvh">
      <Thread />
      <WeatherTool />
    </main>
  );
}
