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
    <div class="rounded-2xl bg-gradient-to-br ${bgClass} p-6 text-white shadow-lg max-w-md">
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

import { AUIDemoComponent } from "./aui-demo";
import { FeatureShowcaseComponent } from "./feature-showcase";
import { DeleteConfirmationComponent } from "./delete-confirmation";
import { WeatherAlertsComponent } from "./weather-alerts";

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

runtime.register(AUIDemoComponent);
runtime.register(FeatureShowcaseComponent);
runtime.register(DeleteConfirmationComponent);
runtime.register(WeatherAlertsComponent);

runtime.register({
  name: "ImageAnalysis",
  schema: z.object({
    fileId: z.string(),
    analysisType: z.string(),
    result: z.object({
      clouds: z.string(),
      precipitation: z.string(),
      confidence: z.number(),
    }),
  }),
  render: (props) => `
    <div style="padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🖼️ Image Analysis Result</h3>
      <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
        <div><strong>File ID:</strong> <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">${props.fileId}</code></div>
        <div><strong>Analysis Type:</strong> ${props.analysisType}</div>
      </div>
      <div style="display: grid; gap: 8px;">
        <div>☁️ <strong>Clouds:</strong> ${props.result.clouds}</div>
        <div>🌧️ <strong>Precipitation:</strong> ${props.result.precipitation}</div>
        <div>📊 <strong>Confidence:</strong> ${(props.result.confidence * 100).toFixed(1)}%</div>
      </div>
    </div>
  `,
});

runtime.register({
  name: "RefreshIndicator",
  schema: z.object({
    location: z.string(),
    refreshed: z.boolean(),
    timestamp: z.string(),
    forced: z.boolean(),
  }),
  render: (props) => `
    <div style="padding: 16px; background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.2);">
      <div style="
        font-size: 24px;
        animation: spin 1s linear infinite;
      ">🔄</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 16px;">✅ Data Refreshed</div>
        <div style="font-size: 14px; opacity: 0.9;">
          ${props.location} at ${new Date(props.timestamp).toLocaleTimeString()}
          ${props.forced ? " • Forced refresh" : ""}
        </div>
      </div>
    </div>
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `,
});

runtime.register({
  name: "SaveConfirmation",
  schema: z.object({
    saved: z.boolean().optional(),
    error: z.string().optional(),
    requiresAuth: z.boolean().optional(),
    locationId: z.string().optional(),
    location: z.string().optional(),
    nickname: z.string().optional(),
    userId: z.string().optional(),
  }),
  render: (props) => {
    if (props.requiresAuth) {
      return `
        <div style="padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border-radius: 12px; text-align: center; border: 1px solid rgba(146, 64, 14, 0.2);">
          <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
          <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Authentication Required</div>
          <div style="font-size: 14px; opacity: 0.8;">Please sign in to save favorites.</div>
        </div>
      `;
    }
    return `
      <div style="padding: 20px; background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 32px; margin-bottom: 12px;">⭐</div>
        <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Saved to Favorites</div>
        <div style="font-size: 16px; opacity: 0.9;">${props.nickname ?? props.location}</div>
        ${props.locationId ? `<div style="font-size: 12px; opacity: 0.7; margin-top: 8px; font-family: monospace; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; display: inline-block;">ID: ${props.locationId}</div>` : ""}
        ${props.userId ? `<div style="font-size: 11px; opacity: 0.6; margin-top: 6px;">User: ${props.userId}</div>` : ""}
      </div>
    `;
  },
});

runtime.register({
  name: "PersonalizedForecast",
  schema: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    personalized: z.boolean(),
    recommendations: z.array(z.string()).nullable(),
    unit: z.string().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    windDirection: z.string().optional(),
  }),
  render: (props) => {
    const tempUnit = props.unit === "celsius" ? "C" : "F";
    return `
      <div style="padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 4px;">${props.location}</div>
            <div style="font-size: 40px; font-weight: 700; margin-bottom: 4px;">${props.temperature}°${tempUnit}</div>
            <div style="font-size: 16px; text-transform: capitalize;">${props.condition}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            ${props.personalized ? '<div style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; backdrop-filter: blur(10px);">✨ Personalized</div>' : ""}
            <div style="font-size: 12px; opacity: 0.8; text-align: right;">
              ${props.humidity !== undefined ? `💧 ${props.humidity}%<br>` : ""}
              ${props.windSpeed !== undefined ? `🌬️ ${props.windSpeed} mph ${props.windDirection ?? ""}<br>` : ""}
            </div>
          </div>
        </div>
        ${
          props.recommendations && props.recommendations.length > 0
            ? `
          <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 16px; margin-top: 16px;">
            <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">💡 Recommendations for you:</div>
            ${props.recommendations.map((r) => `<div style="font-size: 14px; margin-bottom: 6px; padding-left: 16px; position: relative;">• ${r}</div>`).join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  },
});

loadTailwind().then(() => {
  runtime.start();
});
