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

// Create the UI-enabled MCP server with OAuth support
const { toolWithUI, getUICapability, generateManifest, start } =
  createToolUIServer({
    serverId: "weather-mcp",
    name: "Weather MCP Server",
    version: "1.0.0",
    bundleHash:
      "sha256:0000000000000000000000000000000000000000000000000000000000000000", // Replace with actual hash after build
    // NEW: OAuth configuration (optional - for demonstration)
    // In production, uncomment and configure with real auth server
    // oauth: {
    //   resource: "https://weather-mcp.example.com",
    //   authorizationServers: ["https://auth.example.com"],
    //   scopesSupported: ["favorites:read", "favorites:write", "profile:read"],
    //   resourceDocumentation: "https://docs.example.com/weather-mcp",
    // },
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
// Text Formatting Utilities (for legacy mode)
// =============================================================================

function formatWeatherText(weather: WeatherData): string {
  const unit = weather.unit === "celsius" ? "C" : "F";
  const forecastText = weather.forecast
    ? weather.forecast
        .map((day) => `  ${day.day}: ${day.high}°/${day.low}° ${day.condition}`)
        .join("\n")
    : "";

  return `Weather in ${weather.location}: ${weather.temperature}°${unit}, ${weather.condition}

Current Conditions:
• Temperature: ${weather.temperature}°${unit}
• Conditions: ${weather.condition}
• Humidity: ${weather.humidity}%
• Wind: ${weather.windSpeed} mph ${weather.windDirection}

${forecastText ? `5-Day Forecast:\n${forecastText}` : ""}`;
}

function formatComparisonText(
  weather1: WeatherData,
  weather2: WeatherData,
): string {
  return `Weather Comparison:

${weather1.location} vs ${weather2.location}

🌍 ${weather1.location}:
• Temperature: ${weather1.temperature}°${weather1.unit === "celsius" ? "C" : "F"}, ${weather1.condition}
• Humidity: ${weather1.humidity}%, Wind: ${weather1.windSpeed} mph ${weather1.windDirection}

🌍 ${weather2.location}:
• Temperature: ${weather2.temperature}°${weather2.unit === "celsius" ? "C" : "F"}, ${weather2.condition}
• Humidity: ${weather2.humidity}%, Wind: ${weather2.windSpeed} mph ${weather2.windDirection}`;
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
    aui: z
      .boolean()
      .optional()
      .default(true)
      .describe("Enable AUI rich components (fallback to text if false)"),
  }),
  component: "WeatherCard",
  execute: async ({ location, unit, aui }) => {
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

    // Support both legacy (text-only) and AUI modes
    if (aui) {
      // AUI mode: return component reference for rich UI
      return {
        component: "WeatherCard",
        props: {
          location: weather.location,
          temperature: weather.temperature,
          unit: weather.unit,
          condition: weather.condition,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          windDirection: weather.windDirection,
          forecast: weather.forecast,
        },
        // Also provide fallback text for non-AUI clients
        text: formatWeatherText(weather),
      };
    } else {
      // Legacy mode: return formatted text only
      return formatWeatherText(weather);
    }
  },
  transformResult: (result, _args) => {
    // Handle both component result and text result
    if (typeof result === "object" && result.component) {
      return result as Record<string, unknown>; // Pass through AUI result
    }
    // For text results, return as MCP text content
    return {
      content: [
        {
          type: "text",
          text: result as string,
        },
      ],
    };
  },
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
    aui: z
      .boolean()
      .optional()
      .default(true)
      .describe("Enable AUI rich components (fallback to text if false)"),
  }),
  component: "WeatherComparison",
  execute: async ({ location1, location2, aui }) => {
    const [weather1, weather2] = await Promise.all([
      fetchWeather(location1),
      fetchWeather(location2),
    ]);

    if (aui) {
      // AUI mode: return component reference
      return {
        component: "WeatherComparison",
        props: { location1: weather1, location2: weather2 },
        // Fallback text
        text: formatComparisonText(weather1, weather2),
      };
    } else {
      // Legacy mode: return formatted text
      return formatComparisonText(weather1, weather2);
    }
  },
  transformResult: (result, _args) => {
    // Handle both component result and text result
    if (typeof result === "object" && result.component) {
      return result as Record<string, unknown>; // Pass through AUI result
    }
    // For text results, return as MCP text content
    return {
      content: [
        {
          type: "text",
          text: result as string,
        },
      ],
    };
  },
});

toolWithUI({
  name: "aui_demo",
  description:
    "Demo tool that shows all AUI protocol features: theme awareness, widget state, display modes, and follow-up messages.",
  parameters: z.object({
    title: z.string().optional().default("AUI Protocol Demo"),
    message: z.string().optional(),
  }),
  component: "AUIDemo",
  execute: async ({ title, message }) => {
    return {
      component: "AUIDemo",
      props: { title, message },
      text: `AUI Demo Widget: ${title}${message ? ` - ${message}` : ""}`,
    };
  },
  transformResult: (result, _args) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return {
      content: [{ type: "text", text: String(result) }],
    };
  },
});

// =============================================================================
// Tool: delete_location (Demonstrates Tool Annotations)
// =============================================================================

toolWithUI({
  name: "delete_location",
  description:
    "Delete a saved location from favorites. Demonstrates destructive tool annotation.",
  parameters: z.object({
    locationId: z.string().describe("ID of the location to delete"),
  }),
  component: "DeleteConfirmation",
  annotations: {
    destructiveHint: true,
    completionMessage: "Location deleted successfully",
  },
  execute: async ({ locationId }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const result = {
      deleted: true,
      locationId,
      message: `Location ${locationId} has been removed from your favorites.`,
    };
    return {
      component: "DeleteConfirmation",
      props: result,
      text: result.message,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

// =============================================================================
// Tool: get_weather_alerts (Demonstrates Invocation Messages + Read-Only)
// =============================================================================

toolWithUI({
  name: "get_weather_alerts",
  description:
    "Get active weather alerts for a region. Demonstrates invocation messages and read-only annotation.",
  parameters: z.object({
    region: z.string().describe("Region code (e.g., 'US-CA')"),
  }),
  component: "WeatherAlerts",
  annotations: {
    readOnlyHint: true,
  },
  invocationMessages: {
    invoking: "Checking weather alerts...",
    invoked: "Weather alerts retrieved",
  },
  execute: async ({ region }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const result = {
      region,
      alerts: [
        {
          type: "Heat Advisory",
          severity: "moderate",
          expires: "2024-01-15T18:00:00Z",
        },
        {
          type: "Air Quality Alert",
          severity: "low",
          expires: "2024-01-14T12:00:00Z",
        },
      ],
    };
    return {
      component: "WeatherAlerts",
      props: result,
      text: `${result.alerts.length} weather alerts for ${region}`,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

// =============================================================================
// Tool: analyze_weather_image (Demonstrates File Handling)
// =============================================================================

toolWithUI({
  name: "analyze_weather_image",
  description:
    "Analyze a weather-related image (satellite, radar, etc.). Demonstrates file parameter handling.",
  parameters: z.object({
    imageFile: z.string().describe("File ID of the uploaded image"),
    analysisType: z
      .enum(["satellite", "radar", "forecast"])
      .default("satellite"),
  }),
  component: "ImageAnalysis",
  fileParams: ["imageFile"],
  visibility: "public",
  widgetAccessible: true,
  execute: async ({ imageFile, analysisType }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const result = {
      fileId: imageFile,
      analysisType,
      result: {
        clouds: "scattered cumulus",
        precipitation: "none detected",
        confidence: 0.87,
      },
    };
    return {
      component: "ImageAnalysis",
      props: result,
      text: `Image analysis (${analysisType}): ${result.result.clouds}, ${result.result.precipitation}`,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

// =============================================================================
// Tool: refresh_weather_data (Private Tool - Widget Accessible Only)
// =============================================================================

toolWithUI({
  name: "refresh_weather_data",
  description:
    "Refresh weather data for a location. Hidden from model, callable from widget only.",
  parameters: z.object({
    location: z.string(),
    force: z.boolean().default(false),
  }),
  component: "RefreshIndicator",
  visibility: "private",
  widgetAccessible: true,
  execute: async ({ location, force }) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const result = {
      location,
      refreshed: true,
      timestamp: new Date().toISOString(),
      forced: force,
    };
    return {
      component: "RefreshIndicator",
      props: result,
      text: `Weather data refreshed for ${location}`,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

// =============================================================================
// Tool: save_favorite_location (OAuth Protected)
// =============================================================================

toolWithUI({
  name: "save_favorite_location",
  description: "Save a location to your favorites. Requires authentication.",
  parameters: z.object({
    location: z.string().describe("Location to save"),
    nickname: z.string().optional().describe("Custom name for this location"),
    simulateAuth: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Simulate authenticated request (for demo). Defaults to true for easy testing.",
      ),
  }),
  component: "SaveConfirmation",
  securitySchemes: [{ type: "oauth2", scopes: ["favorites:write"] }],
  execute: async ({ location, nickname, simulateAuth }, context) => {
    const isAuthenticated = simulateAuth || context?.auth?.isAuthenticated;

    if (!isAuthenticated) {
      const result = {
        error: "Authentication required",
        requiresAuth: true,
      };
      return {
        component: "SaveConfirmation",
        props: result,
        text: "Authentication required to save favorites",
      };
    }

    const locationId = `fav_${location.toLowerCase().replace(/\s+/g, "_")}_${Date.now().toString(36)}`;
    const result = {
      saved: true,
      locationId,
      location,
      nickname: nickname ?? location,
      userId: context?.auth?.claims?.sub ?? "demo_user_123",
    };
    return {
      component: "SaveConfirmation",
      props: result,
      text: `Saved "${result.nickname}" to favorites with ID: ${locationId}`,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

// =============================================================================
// Tool: get_personalized_forecast (Mixed Security)
// =============================================================================

toolWithUI({
  name: "get_personalized_forecast",
  description:
    "Get weather forecast. Anonymous users get basic forecast, authenticated users get personalized recommendations.",
  parameters: z.object({
    location: z.string(),
  }),
  component: "PersonalizedForecast",
  securitySchemes: [
    { type: "noauth" },
    { type: "oauth2", scopes: ["profile:read"] },
  ],
  execute: async ({ location }, context) => {
    const isAuthenticated = context?.auth?.isAuthenticated ?? false;
    const baseForecast = await fetchWeather(location);

    const result = isAuthenticated
      ? {
          ...baseForecast,
          personalized: true,
          recommendations: [
            "Based on your preferences, bring a light jacket",
            "Good day for outdoor activities you enjoy",
          ],
          userId: context?.auth?.claims?.sub,
        }
      : {
          ...baseForecast,
          personalized: false,
          recommendations: null,
        };

    return {
      component: "PersonalizedForecast",
      props: result,
      text: `${result.location}: ${result.temperature}°${result.unit === "celsius" ? "C" : "F"} - ${result.condition}${result.personalized ? " (personalized)" : ""}`,
    };
  },
  transformResult: (result) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});

toolWithUI({
  name: "feature_showcase",
  description:
    "Launch the comprehensive AUI feature showcase. Demonstrates ALL client-side APIs including file handling, tool calling, modals, and more.",
  parameters: z.object({
    title: z.string().optional().default("AUI Feature Showcase"),
  }),
  component: "FeatureShowcase",
  annotations: {
    readOnlyHint: true,
  },
  invocationMessages: {
    invoking: "Loading feature showcase...",
    invoked: "Feature showcase ready!",
  },
  execute: async ({ title }) => {
    return {
      component: "FeatureShowcase",
      props: { title },
      text: `AUI Feature Showcase: ${title}`,
    };
  },
  transformResult: (result, _args) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: String(result) }] };
  },
});

console.error("Weather MCP Server starting...");
console.error("UI Capability:", JSON.stringify(getUICapability(), null, 2));
console.error("Manifest:", JSON.stringify(generateManifest(), null, 2));

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
