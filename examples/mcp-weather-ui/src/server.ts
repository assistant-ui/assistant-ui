/**
 * Example MCP Server with Tool UI
 *
 * This example demonstrates how to create an MCP server that provides
 * rich UI components for tool results using @assistant-ui/tool-ui-server.
 *
 * Usage:
 *   npx tsx src/server.ts
 *
 * Or build and run:
 *   pnpm build && node dist/server.js
 */

import { createToolUIServer } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

// Create the UI-enabled MCP server
const { server, toolWithUI, getUICapability, generateManifest, start } =
  createToolUIServer({
    serverId: "weather-mcp",
    name: "Weather MCP Server",
    version: "1.0.0",
    bundleHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000", // Replace with actual hash after build
  });

// =============================================================================
// Weather Data Types
// =============================================================================

interface WeatherData {
  location: string;
  temperature: number;
  unit: "celsius" | "fahrenheit";
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

// =============================================================================
// Mock Weather API
// =============================================================================

async function fetchWeather(location: string): Promise<WeatherData> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate mock weather data based on location hash
  const hash = location.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const conditions = ["sunny", "cloudy", "rainy", "snowy", "stormy"] as const;

  return {
    location,
    temperature: 50 + (hash % 50),
    unit: "fahrenheit",
    condition: conditions[hash % conditions.length]!,
    humidity: 30 + (hash % 60),
    windSpeed: 5 + (hash % 20),
    windDirection: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][hash % 8]!,
    forecast: [
      { day: "Mon", high: 72, low: 58, condition: "sunny" },
      { day: "Tue", high: 68, low: 55, condition: "cloudy" },
      { day: "Wed", high: 65, low: 52, condition: "rainy" },
      { day: "Thu", high: 70, low: 54, condition: "sunny" },
      { day: "Fri", high: 75, low: 60, condition: "sunny" },
    ],
  };
}

// =============================================================================
// Tool: get_weather
// =============================================================================

toolWithUI({
  name: "get_weather",
  description:
    "Get current weather and forecast for a location. Returns temperature, conditions, humidity, and 5-day forecast.",
  parameters: z.object({
    location: z
      .string()
      .describe("City name or location (e.g., 'San Francisco, CA')"),
    unit: z
      .enum(["celsius", "fahrenheit"])
      .optional()
      .default("fahrenheit")
      .describe("Temperature unit"),
  }),
  component: "WeatherCard",
  execute: async ({ location, unit }) => {
    const weather = await fetchWeather(location);

    // Convert temperature if needed
    if (unit === "celsius" && weather.unit === "fahrenheit") {
      weather.temperature = Math.round(((weather.temperature - 32) * 5) / 9);
      weather.unit = "celsius";
      weather.forecast = weather.forecast.map((day) => ({
        ...day,
        high: Math.round(((day.high - 32) * 5) / 9),
        low: Math.round(((day.low - 32) * 5) / 9),
      }));
    }

    return weather;
  },
  transformResult: (result) => ({
    location: result.location,
    temperature: result.temperature,
    unit: result.unit,
    condition: result.condition,
    humidity: result.humidity,
    windSpeed: result.windSpeed,
    windDirection: result.windDirection,
    forecast: result.forecast,
  }),
});

// =============================================================================
// Tool: compare_weather
// =============================================================================

toolWithUI({
  name: "compare_weather",
  description:
    "Compare weather between two locations side by side. Useful for travel planning.",
  parameters: z.object({
    location1: z.string().describe("First city to compare"),
    location2: z.string().describe("Second city to compare"),
  }),
  component: "WeatherComparison",
  execute: async ({ location1, location2 }) => {
    const [weather1, weather2] = await Promise.all([
      fetchWeather(location1),
      fetchWeather(location2),
    ]);
    return { location1: weather1, location2: weather2 };
  },
});

// =============================================================================
// Log capability and manifest for debugging
// =============================================================================

console.error("Weather MCP Server starting...");
console.error("UI Capability:", JSON.stringify(getUICapability(), null, 2));
console.error("Manifest:", JSON.stringify(generateManifest(), null, 2));

// Start the server
start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
