"use client";

import { LiveCryptoDashboard } from "@/components/tool-ui/LiveCryptoDashboard";
import { LiveStockTicker } from "@/components/tool-ui/LiveStockTicker";
import { WeatherWidget } from "@/components/tool-ui/weather-widget";
import { ToolUIRegistryImpl } from "@assistant-ui/tool-ui-runtime";
import type { ToolUIFactoryProps } from "@assistant-ui/tool-ui-runtime";

/**
 * ToolUIFactoryProps shape:
 * - id: string
 * - context: { toolCallId, toolName, args }
 * - lifecycle: "created" | "resolved" | "mounting" | "active" | "updating" | "closing" | "closed"
 * - result?: unknown
 */
export const toolUIRegistry = new ToolUIRegistryImpl();

// WEATHER TOOL

toolUIRegistry.register({
  toolName: "get_weather",
  factory: (props: ToolUIFactoryProps) => {
    const { context, lifecycle, result } = props;

    const location =
      context.args &&
      typeof context.args === "object" &&
      "location" in context.args
        ? String(context.args.location)
        : "Unknown";

    if (lifecycle === "mounting" || !result) {
      return {
        kind: "html",
        html: `
          <div style="padding: 16px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: system-ui, sans-serif; min-width: 200px;">
            <div style="font-size: 14px; opacity: 0.9;">Loading weather for</div>
            <div style="font-size: 18px; font-weight: bold;">${location}...</div>
            <div style="margin-top: 12px;">
              <div style="width: 20px; height: 20px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </div>
        `,
        height: 120,
      };
    }

    if (
      typeof result !== "object" ||
      result === null ||
      !("location" in result) ||
      !("temperature" in result)
    ) {
      return { kind: "empty" };
    }

    const data = result as {
      location: string;
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
      current: {
        temp: number;
        tempMin: number;
        tempMax: number;
        condition:
          | "clear"
          | "partly-cloudy"
          | "cloudy"
          | "overcast"
          | "fog"
          | "drizzle"
          | "rain"
          | "heavy-rain"
          | "thunderstorm"
          | "snow"
          | "sleet"
          | "hail"
          | "windy";
      };
      forecast: {
        day: string;
        tempMin: number;
        tempMax: number;
        condition:
          | "clear"
          | "partly-cloudy"
          | "cloudy"
          | "overcast"
          | "fog"
          | "drizzle"
          | "rain"
          | "heavy-rain"
          | "thunderstorm"
          | "snow"
          | "sleet"
          | "hail"
          | "windy";
      }[];
    };

    return {
      kind: "react",
      element: (
        <WeatherWidget
          key={data.location}
          id={data.location}
          location={data.location}
          current={data.current}
          forecast={data.forecast}
        />
      ),
    };
  },
});

/**
 * LIVE STOCK TICKER - Updates every second!
 * This showcases what Tool UI Runtime enables that makeAssistantToolUI cannot:
 * A stateful React component with live client-side updates
 */

toolUIRegistry.register({
  toolName: "get_stock_price",
  factory: (props: ToolUIFactoryProps) => {
    const { context, lifecycle, result } = props;

    const stockArgs =
      typeof context.args === "string"
        ? JSON.parse(context.args || "{}")
        : (context.args as any) || {};
    const stockData =
      typeof result === "string"
        ? JSON.parse(result || "null")
        : (result as any);

    const symbol = stockArgs?.symbol?.toUpperCase() || "???";
    const isLoading =
      !result || lifecycle === "created" || lifecycle === "mounting";

    if (isLoading) {
      return {
        kind: "react" as const,
        element: (
          <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                📈
              </div>
              <div>
                <div className="font-bold text-gray-900">{symbol}</div>
                <div className="text-gray-500 text-sm">
                  Connecting to market...
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }

    return {
      kind: "react" as const,
      element: <LiveStockTicker initialData={stockData} />,
    };
  },
});

// LIVE CRYPTO PRICES - Multiple coins updating simultaneously

toolUIRegistry.register({
  toolName: "get_crypto_prices",
  factory: (props: ToolUIFactoryProps) => {
    const { lifecycle, result } = props;
    const isLoading =
      !result || lifecycle === "created" || lifecycle === "mounting";
    const cryptoData =
      typeof result === "string" ? JSON.parse(result || "null") : result;

    if (isLoading) {
      return {
        kind: "react" as const,
        element: (
          <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="font-medium text-gray-700">
              Loading crypto prices...
            </div>
          </div>
        ),
      };
    }

    return {
      kind: "react" as const,
      element: <LiveCryptoDashboard initialData={cryptoData} />,
    };
  },
});

/**
 * This renders arbitrary HTML in a secure sandboxed iframe.
 *
 * Use cases:
 * - LLM-generated HTML/CSS
 * - MCP server HTML responses
 * - Untrusted third-party content
 * - Dynamic visualizations
 */
toolUIRegistry.register({
  toolName: "generate_ui",
  factory: (props: ToolUIFactoryProps) => {
    const { context, lifecycle, result } = props;

    const args = context.args as
      | { description?: string; style?: string }
      | undefined;
    const description = args?.description || "UI component";

    // Loading state - also rendered as HTML in sandbox
    if (lifecycle === "mounting" || !result) {
      return {
        kind: "html" as const,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: system-ui, sans-serif;
                padding: 20px;
                background: #f0f0f0;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #ccc;
                border-top-color: #666;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <span>Generating: ${description}...</span>
          </body>
          </html>
        `,
        height: 80,
      };
    }

    // Result contains the generated HTML
    const data = result as { html: string; style: string; description: string };

    return {
      kind: "html" as const,
      html: data.html,
      height: 180,
    };
  },
});

export default toolUIRegistry;
