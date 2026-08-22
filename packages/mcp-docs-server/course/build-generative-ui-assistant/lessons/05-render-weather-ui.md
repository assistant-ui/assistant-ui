# Render weather as application UI

Step 4 proved that the model can call Open-Meteo and that a generic inspector
can show structured data. Now give `get_weather` an application-owned renderer.
The renderer receives typed tool arguments, result, and execution status—it is
not HTML written by the model.

```text
model selects get_weather → server runs Open-Meteo → structured result streams
                                                → WeatherCard renders it
```

## Orient before editing

1. Confirm the Step 4 weather request works. With `OPENAI_API_KEY`, you should
   see generic `geocode_location` and `get_weather` entries. Without a key,
   confirm the direct Open-Meteo fallback produces live JSON.
2. Read `tools/generative-ui` and `tools/tool-ui` with the docs tool. Inspect
   how the toolkit renderer is registered into the client-side `AuiProvider`
   shown later in this lesson.
3. Do not change the Open-Meteo request functions, Zod schemas, or chat-route
   fallback. This step only attaches presentation to the existing result.

## Create the typed weather card

Create `components/tools/weather-card.tsx`:

```tsx
"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CloudSun, Loader2, TriangleAlert, Wind } from "lucide-react";

type WeatherArgs = { location: string; latitude: number; longitude: number };
type WeatherResult =
  | {
      success: true;
      location: string;
      coordinates: { latitude: number; longitude: number };
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    }
  | { success: false; error: string };

function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  return "Stormy";
}

export const WeatherCard: ToolCallMessagePartComponent<WeatherArgs, WeatherResult> = ({ args, result, status }) => {
  if (status.type === "running" || !result) {
    return <div className="my-3 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950"><Loader2 className="size-5 animate-spin" />Checking weather in {args.location}…</div>;
  }

  if (!result.success) {
    return <div className="my-3 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"><TriangleAlert className="size-5" />{result.error}</div>;
  }

  const { current } = result;
  return (
    <div className="my-3 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-white/75">Live Open-Meteo weather</p><h3 className="mt-1 text-xl font-semibold">{result.location}</h3></div><CloudSun className="size-8 text-amber-200" /></div>
      <p className="mt-6 text-5xl font-semibold tracking-tight">{Math.round(current.temperature_2m)}°C</p>
      <p className="mt-1 text-sm text-white/75">Feels like {Math.round(current.apparent_temperature)}°C</p>
      <div className="mt-4 flex items-center justify-between text-sm text-white/85"><span>{weatherLabel(current.weather_code)}</span><span className="flex items-center gap-1.5"><Wind className="size-4" />{Math.round(current.wind_speed_10m)} km/h</span></div>
    </div>
  );
};
```

## Register the renderer

Create `components/tool-provider.tsx`. It makes the toolkit, including its
renderer, available to the thread without replacing the chat runtime.

```tsx
"use client";

import { AuiProvider, Tools, useAui } from "@assistant-ui/react";
import toolkit from "../app/toolkit";

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const aui = useAui({ tools: Tools({ toolkit }) });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}
```

Replace `app/page.tsx` so the existing `Thread` is inside the provider:

```tsx
import { Thread } from "../components/assistant-ui/thread";
import { ToolProvider } from "../components/tool-provider";

export default function Page() {
  return <ToolProvider><main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]"><Thread /></main></ToolProvider>;
}
```

In `app/toolkit.tsx`, import and attach the card; everything else in the
Open-Meteo toolkit from Step 4 stays unchanged:

```tsx
import { WeatherCard } from "../components/tools/weather-card";

// In the existing get_weather definition, after execute:
render: WeatherCard,
```

In `components/assistant-ui/thread.tsx`, retain the Step 4 message components
but change the tool mapping to use a fallback only for tools that do not have a
registered renderer:

```tsx
<MessagePrimitive.Content
  components={{ tools: { Fallback: ToolFallback } }}
/>
```

Also change the empty-state suggestions to make the intended UI easy to test:

```tsx
const suggestions = [
  { label: "Weather card", prompt: "What's the weather in San Francisco?", icon: CloudSun },
  { label: "London card", prompt: "What's the weather in London?", icon: MapPin },
  { label: "Geocode only", prompt: "Find the coordinates for Tokyo without checking the weather.", icon: MapPin },
];
```

`get_weather` now renders `WeatherCard`; `geocode_location` deliberately keeps
using `ToolFallback`. This demonstrates that tool UI is selected per tool, not
for every result in a message.

## Run and experience it

Run `npm run dev` and open the local URL with browser tools when available;
otherwise provide it to the learner. With `OPENAI_API_KEY` configured, select
**Weather card** and watch for the loading state, then confirm the gradient
card shows the requested city, live temperature, feels-like value, condition,
and wind speed. Ask for London in a new conversation and confirm the card’s
location changes. Use **Geocode only** and confirm it remains the generic
structured fallback.

Without an OpenAI key, Step 4’s direct fallback remains valid and displays live
JSON, but it cannot prove model-selected rendering. Tell the learner exactly
which path they exercised.

## Checkpoint

Ask the learner to identify one card value and its source (`current` in the
Open-Meteo result), then confirm they saw the generic fallback for geocoding.
Only then proceed to the shared notepad in Step 6.
