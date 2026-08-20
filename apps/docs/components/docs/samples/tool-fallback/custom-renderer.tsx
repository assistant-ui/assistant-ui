"use client";

import { useCallback } from "react";
import {
  AssistantRuntimeProvider,
  useAssistantToolUI,
  useLocalRuntime,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function WeatherToolUI() {
  const runtime = useLocalRuntime({
    async *run({ abortSignal }) {
      const toolCall = {
        type: "tool-call" as const,
        toolCallId: "call_get_weather_1",
        toolName: "get_weather",
        args: { location: "San Francisco" },
        argsText: JSON.stringify({ location: "San Francisco" }, null, 2),
      };
      yield { content: [toolCall] };
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (abortSignal.aborted) return;
      yield {
        content: [
          {
            ...toolCall,
            result: { temperature: 72, condition: "Sunny", humidity: 45 },
          },
        ],
      };
    },
  });

  // Defer the append one tick so the strict-mode mount/unmount cycle cannot
  // abort the run before the first yield.
  const startRun = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const timeout = setTimeout(() => {
        if (runtime.thread.getState().messages.length > 0) return;
        runtime.thread.append("What's the weather in San Francisco?");
      }, 0);
      return () => clearTimeout(timeout);
    },
    [runtime],
  );

  function RegisterWeatherToolUI() {
    useAssistantToolUI({
      toolName: "get_weather",
      display: "standalone",
      render: ({
        args,
        result,
      }: ToolCallMessagePartProps<
        { location: string },
        { temperature: number; condition: string; humidity: number }
      >) => (
        <div className="border-border bg-muted/50 my-2 rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">Weather in {args.location}</p>
          <p className="text-muted-foreground">
            {result
              ? `${result.temperature}°F, ${result.condition}, ${result.humidity}% humidity`
              : "Checking the forecast…"}
          </p>
        </div>
      ),
    });
    return null;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <RegisterWeatherToolUI />
      <div ref={startRun} className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ToolFallbackRendererSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <WeatherToolUI />
    </SampleFrame>
  );
}
