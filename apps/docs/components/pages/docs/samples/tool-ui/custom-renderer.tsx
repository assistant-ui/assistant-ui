"use client";

import { useEffect } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  defineToolkit,
  Tools,
  useLocalRuntime,
} from "@assistant-ui/react";
// This type has a separate import because the preview drops a complete unused block.
import type { AssistantRuntime } from "@assistant-ui/react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function WeatherToolUI({
  args,
  result,
}: ToolCallMessagePartProps<
  { location: string },
  { temperature: number; condition: string; humidity: number }
>) {
  return (
    <div className="border-border bg-muted/50 my-2 rounded-lg border px-4 py-3 text-sm">
      <p className="font-medium">Weather in {args.location}</p>
      <p className="text-muted-foreground">
        {result
          ? `${result.temperature}°F, ${result.condition}, ${result.humidity}% humidity`
          : "Checking the forecast…"}
      </p>
    </div>
  );
}

const weatherToolkit = defineToolkit({
  get_weather: {
    type: "backend",
    display: "standalone",
    render: WeatherToolUI,
  },
});

const config = AuiConfig({ tools: Tools({ toolkit: weatherToolkit }) });

function useStartRun(runtime: AssistantRuntime) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      const message = runtime.thread.getState().messages[0];
      if (!message) return;
      runtime.thread.startRun({ parentId: message.id });
    }, 0);

    return () => clearTimeout(timeout);
  }, [runtime]);
}

function WeatherToolChat() {
  const runtime = useLocalRuntime(
    {
      async *run({ abortSignal }) {
        const toolCall = {
          type: "tool-call" as const,
          toolCallId: `call_${crypto.randomUUID()}`,
          toolName: "get_weather",
          args: { location: "San Francisco" },
          argsText: JSON.stringify({ location: "San Francisco" }, null, 2),
        };
        yield { content: [toolCall] };
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
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
    },
    {
      initialMessages: [
        { role: "user", content: "What's the weather in San Francisco?" },
      ],
    },
  );

  useStartRun(runtime);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="h-full">
        <Thread autoFocus={false} />
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ToolUIRendererSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <WeatherToolChat />
    </SampleFrame>
  );
}
