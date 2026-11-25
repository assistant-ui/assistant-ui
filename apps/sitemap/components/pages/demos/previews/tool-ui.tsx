"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { Thread } from "@/components/pages/demos/ui/thread";
import { toolkit } from "@/components/pages/demos/ui/weather-toolkit";
import { lastUserText, streamWords, wait } from "./script";

const CONDITIONS = [
  "Sunny",
  "Partly cloudy",
  "Cloudy",
  "Rain",
  "Windy",
] as const;

/** The city after "in", "for", or "at", or Tokyo when the message names none. */
function cityIn(prompt: string) {
  const match = /\b(?:in|for|at)\s+([a-z][a-z .'-]*)/i.exec(prompt);
  const words = (match?.[1] ?? "")
    .replace(/\b(today|tomorrow|now|right now)\b.*$/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "Tokyo";
  return words
    .map((word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** The same made-up weather for the same city, every time. */
function weatherFor(city: string) {
  let hash = 0;
  for (const char of city) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return {
    temperature: 6 + (hash % 26),
    condition: CONDITIONS[hash % CONDITIONS.length]!,
  };
}

/**
 * Stands in for the route: calls `getWeather` like the model would, returns
 * the result the tool's `execute` would, then writes a short reply.
 */
const scriptedWeather: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const city = cityIn(lastUserText(messages));
    const call = {
      type: "tool-call" as const,
      toolCallId: `weather-${messages.length}`,
      toolName: "getWeather",
      args: { city },
      argsText: JSON.stringify({ city }),
    };

    await wait(300);
    if (abortSignal.aborted) return;
    yield { content: [call] };

    await wait(900);
    if (abortSignal.aborted) return;
    const result = weatherFor(city);
    const done = { ...call, result };
    yield { content: [done] };

    const reply = `It is ${result.temperature}°C and ${result.condition.toLowerCase()} in ${city}. These numbers come from this page's script; with the route, \`getWeather\` fetches them on the server.`;
    for await (const text of streamWords(reply, abortSignal)) {
      yield { content: [done, { type: "text", text }] };
    }
  },
};

export function ToolUIPreview() {
  const runtime = useLocalRuntime(scriptedWeather);
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
