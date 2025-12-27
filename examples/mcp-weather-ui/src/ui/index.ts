/**
 * Weather UI Components Bundle
 *
 * This file is bundled and served from the PSL-isolated domain.
 * It runs in a sandboxed iframe and communicates with the parent
 * via postMessage.
 */

import { createToolUIRuntime, emitAction } from "@assistant-ui/tool-ui-server";
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
// Styling
// =============================================================================

const styles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: transparent;
    color: #1f2937;
  }

  .weather-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    color: white;
    max-width: 400px;
  }

  .weather-card.sunny {
    background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  }

  .weather-card.cloudy {
    background: linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%);
  }

  .weather-card.rainy {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  .weather-card.snowy {
    background: linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%);
    color: #1f2937;
  }

  .weather-card.stormy {
    background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
  }

  .weather-location {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .weather-main {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .weather-temp {
    font-size: 3rem;
    font-weight: 700;
  }

  .weather-condition {
    font-size: 1.5rem;
  }

  .weather-icon {
    font-size: 3rem;
  }

  .weather-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .weather-forecast {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .forecast-day {
    text-align: center;
    font-size: 0.75rem;
  }

  .forecast-day-name {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .forecast-temps {
    opacity: 0.8;
  }

  .weather-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .action-button {
    margin-top: 16px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: inherit;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .action-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

// =============================================================================
// Helpers
// =============================================================================

function getWeatherIcon(condition: string): string {
  switch (condition) {
    case "sunny":
      return "☀️";
    case "cloudy":
      return "☁️";
    case "rainy":
      return "🌧️";
    case "snowy":
      return "❄️";
    case "stormy":
      return "⛈️";
    default:
      return "🌤️";
  }
}

function formatTemperature(temp: number, unit: string): string {
  return `${temp}°${unit === "celsius" ? "C" : "F"}`;
}

// =============================================================================
// Components
// =============================================================================

function renderWeatherCard(
  props: z.infer<typeof WeatherCardSchema>,
): string {
  const icon = getWeatherIcon(props.condition);
  const temp = formatTemperature(props.temperature, props.unit);

  return `
    <div class="weather-card ${props.condition}">
      <div class="weather-location">${escapeHtml(props.location)}</div>
      <div class="weather-main">
        <span class="weather-icon">${icon}</span>
        <span class="weather-temp">${temp}</span>
        <span class="weather-condition">${capitalize(props.condition)}</span>
      </div>
      <div class="weather-details">
        <div>💧 Humidity: ${props.humidity}%</div>
        <div>💨 Wind: ${props.windSpeed} mph ${props.windDirection}</div>
      </div>
      ${
        props.forecast
          ? `
        <div class="weather-forecast">
          ${props.forecast
            .map(
              (day) => `
            <div class="forecast-day">
              <div class="forecast-day-name">${day.day}</div>
              <div>${getWeatherIcon(day.condition)}</div>
              <div class="forecast-temps">${day.high}° / ${day.low}°</div>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
      <button class="action-button" onclick="window.handleRefresh()">
        🔄 Refresh
      </button>
    </div>
  `;
}

function renderWeatherComparison(
  props: z.infer<typeof WeatherComparisonSchema>,
): string {
  return `
    <div class="weather-comparison">
      ${renderWeatherCard(props.location1)}
      ${renderWeatherCard(props.location2)}
    </div>
  `;
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// =============================================================================
// Runtime Setup
// =============================================================================

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Global action handler
(window as unknown as { handleRefresh: () => void }).handleRefresh = () => {
  emitAction("refresh");
};

// Create and start the runtime
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

runtime.start();
