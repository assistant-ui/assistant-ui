"use client";

import { Thread } from "@/components/ui/assistant-ui/thread";
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
  render: ({ part }) => {
    return (
      <p className="my-4 text-center font-mono text-sm font-bold text-blue-500 first:mt-0">
        get_weather({JSON.stringify(part.args)})
        {!!part.result && <> =&gt; {JSON.stringify(part.result)}</>}
      </p>
    );
  },
});

export default function Home() {
  return (
    <main className="h-full">
      <Thread />
      <WeatherTool />
    </main>
  );
}
