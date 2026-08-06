# Add a weather tool

Text chat can explain weather, but it cannot demonstrate a real application
capability. In this step the model will choose and call two live server tools:
one resolves a city and the other fetches its current weather from Open-Meteo.
Open-Meteo needs no API key. Keep the generic tool UI visible on purpose;
custom weather cards arrive in the next step.

## Prepare the project

1. Ensure Steps 1–3 run before changing anything.
2. Install the one new dependency for this step:

   ```bash
   npm install zod
   ```

   Check that `zod` is present in `package.json` before continuing.
3. Use the docs tool to read `tools/defining-tools`, `ui/tool-fallback`, and
   the `withAui` Next.js setup. A tool description helps the model choose a
   capability; its Zod schema constrains arguments; `execute` produces the
   result the UI renders.

## Define live weather tools

Create `app/toolkit.tsx` with this complete file. The calls run on the server,
so browser code never talks directly to Open-Meteo.

```tsx
"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

export async function geocodeLocation(query: string) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`,
    );
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const data = await response.json();
    if (!data.results?.length) throw new Error("No matching location found");
    const result = data.results[0];
    return { success: true as const, result: { name: result.name, country: result.country, latitude: result.latitude, longitude: result.longitude } };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to geocode location" };
  }
}

export async function getWeather({ location, latitude, longitude }: { location: string; latitude: number; longitude: number }) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`,
    );
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const data = await response.json();
    if (!data.current) throw new Error("Open-Meteo returned no current weather");
    return { success: true as const, location, coordinates: { latitude, longitude }, current: data.current };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch weather" };
  }
}

export default defineToolkit({
  geocode_location: {
    description: "Resolve a city or place to coordinates before calling get_weather.",
    parameters: z.object({ query: z.string().describe("The city or place to find") }),
    execute: async ({ query }) => geocodeLocation(query),
  },
  get_weather: {
    description: "Fetch current weather from Open-Meteo after geocode_location provides coordinates.",
    parameters: z.object({ location: z.string(), latitude: z.number(), longitude: z.number() }),
    execute: async ({ location, latitude, longitude }) => getWeather({ location, latitude, longitude }),
  },
});
```

Replace `app/api/chat/route.ts` so the model receives the toolkit and can make
multiple tool steps. Its no-key path deliberately calls the same exported
Open-Meteo functions directly. That keeps the lesson runnable without an
OpenAI key; it is a direct weather fallback, not model-driven tool selection.

```ts
import { openai } from "@ai-sdk/openai";
import { AISDKToolkit, type FrontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, type UIMessage } from "ai";
import toolkit, { geocodeLocation, getWeather } from "../../toolkit";

const aiToolkit = new AISDKToolkit({ toolkit });

export const maxDuration = 30;

function getRequestedPlace(messages: UIMessage[]) {
  const userMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = userMessage?.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ") ?? "";
  return text.match(/(?:weather (?:in|for)|in)\s+([^?.!,]+)/i)?.[1]?.trim() || "San Francisco";
}

function fallbackWeatherResponse(messages: UIMessage[]) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const place = getRequestedPlace(messages);
      const geocode = await geocodeLocation(place);
      const weather = geocode.success
        ? await getWeather({ location: geocode.result.name, latitude: geocode.result.latitude, longitude: geocode.result.longitude })
        : geocode;
      const messageId = `msg-${crypto.randomUUID()}`;
      const textId = "weather-fallback";
      writer.write({ type: "start", messageId }); writer.write({ type: "start-step" }); writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: `OPENAI_API_KEY is not configured, so this direct Open-Meteo fallback ran for ${place}.\n\n${JSON.stringify(weather, null, 2)}` });
      writer.write({ type: "text-end", id: textId }); writer.write({ type: "finish-step" }); writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request) {
  const { messages, tools }: { messages: UIMessage[]; tools?: FrontendTools } = await request.json();
  if (!process.env.OPENAI_API_KEY) return fallbackWeatherResponse(messages);
  const result = streamText({
    model: openai("gpt-5.6-luna"),
    system: "You are a concise, helpful assistant. Use the weather tools for weather questions.",
    messages: await convertToModelMessages(messages),
    tools: await aiToolkit.tools(tools ? { frontend: tools } : undefined),
    stopWhen: stepCountIs(5),
  });
  return result.toUIMessageStreamResponse();
}
```

Create `components/assistant-ui/tool-fallback.tsx` to expose the structured
tool lifecycle instead of hiding it:

```tsx
"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";

export const ToolFallback: ToolCallMessagePartComponent = ({ toolName, args, result, status }) => (
  <div className="my-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 text-sm">
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
      <code className="font-semibold">{toolName}</code>
      <span className="text-xs text-[var(--muted-foreground)]">{status.type}</span>
    </div>
    <details className="px-4 py-3">
      <summary className="cursor-pointer text-[var(--muted-foreground)]">Inspect structured call</summary>
      <pre className="mt-3 overflow-x-auto text-xs leading-5">{JSON.stringify({ args, result }, null, 2)}</pre>
    </details>
  </div>
);
```

Replace `next.config.ts` so Next compiles the generative toolkit:

```ts
import { withAui } from "@assistant-ui/next";

export default withAui({});
```

Finally replace `components/assistant-ui/thread.tsx`. This retains the Step 3
thread but changes the empty-state prompts to exercise both success and error
paths, and attaches the generic tool fallback to assistant messages.

```tsx
"use client";

import { AuiIf, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowUp, CloudSun, MapPin, Square } from "lucide-react";
import { ToolFallback } from "./tool-fallback";

const suggestions = [
  { label: "Weather call", prompt: "What's the weather in San Francisco?", icon: CloudSun },
  { label: "Tokyo call", prompt: "What's the weather in Tokyo?", icon: MapPin },
  { label: "London call", prompt: "What's the weather in London?", icon: MapPin },
];

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full min-w-0 flex-col">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <p className="font-medium">Generative UI Assistant</p>
        <p className="text-sm text-[var(--muted-foreground)]">Built with assistant-ui</p>
      </header>
      <ThreadPrimitive.Viewport className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <ThreadPrimitive.Empty>
          <div className="flex flex-1 items-center justify-center p-6 text-center"><div className="w-full max-w-2xl">
            <h1 className="text-2xl font-semibold">How can I help you today?</h1>
            <p className="mt-2 text-[var(--muted-foreground)]">Choose a starting point or ask anything.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {suggestions.map(({ label, prompt, icon: Icon }) => (
                <ThreadPrimitive.Suggestion key={label} prompt={prompt} asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left text-sm hover:bg-[var(--muted)]"><Icon className="size-4 text-[var(--muted-foreground)]" />{label}</button>
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div></div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto w-full bg-[var(--background)] p-4">
          <ComposerPrimitive.Root className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-2">
            <ComposerPrimitive.Input asChild><textarea aria-label="Message" placeholder="Ask anything..." rows={1} className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 outline-none" /></ComposerPrimitive.Input>
            <AuiIf condition={(state) => !state.thread.isRunning}><ComposerPrimitive.Send className="flex size-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)] disabled:opacity-40"><ArrowUp className="size-4" /><span className="sr-only">Send message</span></ComposerPrimitive.Send></AuiIf>
            <AuiIf condition={(state) => state.thread.isRunning}><ComposerPrimitive.Cancel className="flex size-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)]"><Square className="size-3.5" fill="currentColor" /><span className="sr-only">Stop generating</span></ComposerPrimitive.Cancel></AuiIf>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return <MessagePrimitive.Root className="mx-auto flex w-full max-w-2xl justify-end px-4 py-2"><div className="max-w-[80%] rounded-2xl bg-[var(--muted)] px-4 py-3"><MessagePrimitive.Content /></div></MessagePrimitive.Root>;
}

function AssistantMessage() {
  return <MessagePrimitive.Root className="mx-auto w-full max-w-2xl px-4 py-3 leading-7"><MessagePrimitive.Content components={{ tools: { Override: ToolFallback } }} /></MessagePrimitive.Root>;
}
```

## Run and prove the tool path

Run `npm run dev`; use browser tools to open the app when available, otherwise
ask the learner to open the local URL. Select **Weather call**. With an
`OPENAI_API_KEY`, expand both structured calls, confirm the order is
`geocode_location` then `get_weather`, and inspect the live `current` weather
object. Repeat with **London call**.

Without an OpenAI key, the same interaction must still run: it displays a
clear fallback notice and the live Open-Meteo JSON for the requested place.
This validates the integration but not model tool selection. Tell the learner
which path they exercised; the model-driven path is the one that proves the
generic tool-call UI.

## Checkpoint

Ask the learner to name their path (model tools or direct fallback) and one
live result they inspected. Do not add a custom weather card yet—that is Step
5.
