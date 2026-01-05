/**
 * Weather UI Components Bundle
 *
 * This file is bundled and served from the PSL-isolated domain.
 * It runs in a sandboxed iframe and communicates with the parent
 * via postMessage.
 */

import { createToolUIRuntime } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

// =============================================================================
// Schemas
// =============================================================================

const WeatherCardSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  unit: z.enum(["celsius", "fahrenheit"]),
  condition: z.enum(["sunny", "cloudy", "rainy", "snowy", "stormy"]),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.string(),
  forecast: z
    .array(
      z.object({
        day: z.string(),
        high: z.number(),
        low: z.number(),
        condition: z.string(),
      }),
    )
    .optional(),
});

const WeatherComparisonSchema = z.object({
  location1: WeatherCardSchema,
  location2: WeatherCardSchema,
});

// =============================================================================
// Styling - matching the original Tailwind component exactly
// =============================================================================

const conditionStyles: Record<string, string> = {
  sunny: "from-amber-400 to-orange-500",
  cloudy: "from-slate-400 to-slate-600",
  rainy: "from-blue-400 to-blue-600",
  snowy: "from-slate-100 to-slate-300 text-slate-800",
  stormy: "from-slate-700 to-purple-900",
};

const conditionIcons: Record<string, string> = {
  sunny: "\u2600\uFE0F",
  cloudy: "\u2601\uFE0F",
  rainy: "\uD83C\uDF27\uFE0F",
  snowy: "\u2744\uFE0F",
  stormy: "\u26C8\uFE0F",
};

// =============================================================================
// Helpers
// =============================================================================

function getWeatherIcon(condition: string): string {
  return conditionIcons[condition] ?? "\uD83C\uDF24\uFE0F";
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================================
// Components - using exact same Tailwind classes as the original
// =============================================================================

function renderWeatherCard(props: z.infer<typeof WeatherCardSchema>): string {
  const bgClass = conditionStyles[props.condition] ?? conditionStyles["cloudy"];
  const icon = getWeatherIcon(props.condition);
  const tempUnit = props.unit === "celsius" ? "C" : "F";

  return `
    <div class="my-4 rounded-2xl bg-gradient-to-br ${bgClass} p-6 text-white shadow-lg max-w-md">
      <div class="mb-2 text-lg font-semibold">${escapeHtml(props.location)}</div>

      <div class="flex items-center gap-4 mb-4">
        <span class="text-5xl">${icon}</span>
        <div>
          <div class="text-4xl font-bold">${props.temperature}&deg;${tempUnit}</div>
          <div class="text-lg capitalize opacity-90">${props.condition}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm opacity-90 mb-4">
        <div>\uD83D\uDCA7 Humidity: ${props.humidity}%</div>
        <div>\uD83D\uDCA8 Wind: ${props.windSpeed} mph ${props.windDirection}</div>
      </div>

      ${
        props.forecast && props.forecast.length > 0
          ? `
        <div class="border-t border-white/20 pt-4 mt-4">
          <div class="flex justify-between">
            ${props.forecast
              .map(
                (day) => `
              <div class="text-center text-sm">
                <div class="font-medium">${day.day}</div>
                <div>${getWeatherIcon(day.condition)}</div>
                <div class="opacity-80">${day.high}&deg; / ${day.low}&deg;</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderWeatherComparison(
  props: z.infer<typeof WeatherComparisonSchema>,
): string {
  return `
    <div class="grid grid-cols-2 gap-4">
      ${renderWeatherCard(props.location1)}
      ${renderWeatherCard(props.location2)}
    </div>
  `;
}

// =============================================================================
// Runtime Setup
// =============================================================================

// Inject Tailwind CSS via CDN and wait for it to load
function loadTailwind(): Promise<void> {
  return new Promise((resolve) => {
    const tailwindScript = document.createElement("script");
    tailwindScript.src = "https://cdn.tailwindcss.com";
    tailwindScript.onload = () => {
      // Give Tailwind a moment to initialize
      setTimeout(resolve, 50);
    };
    tailwindScript.onerror = () => resolve(); // Continue even if fails
    document.head.appendChild(tailwindScript);
  });
}

// Create the runtime
const runtime = createToolUIRuntime();

runtime.register({
  name: "WeatherCard",
  schema: WeatherCardSchema,
  render: renderWeatherCard,
});

runtime.register({
  name: "WeatherComparison",
  schema: WeatherComparisonSchema,
  render: renderWeatherComparison,
});

// Load Tailwind then start the runtime
loadTailwind().then(() => {
  runtime.start();
});
