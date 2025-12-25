"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { WeatherCard } from "./weather-card";
import { WeatherComparison } from "./weather-comparison";

/**
 * Tool UI for the get_weather MCP tool.
 * Renders a beautiful weather card when the AI retrieves weather data.
 */
export const GetWeatherToolUI = makeAssistantToolUI<
  { location: string; unit?: string },
  string
>({
  toolName: "get_weather",
  render: ({ result, status }) => {
    // Show loading state while tool is running
    if (status.type === "running") {
      return (
        <div className="my-4 animate-pulse bg-slate-200 rounded-2xl h-48 max-w-md" />
      );
    }

    // Parse the result
    if (!result) return null;

    try {
      // First parse if it's a string
      let parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Handle MCP result format: {content: [{type: "text", text: "..."}], isError: boolean}
      if (parsed.content && Array.isArray(parsed.content)) {
        // If there's an error, show error state
        if (parsed.isError) {
          const errorText = parsed.content[0]?.text || "Unknown error";
          return (
            <div className="my-4 text-red-500 p-4 rounded-lg bg-red-50">
              Weather error: {errorText}
            </div>
          );
        }
        // Extract the text content and parse it as JSON
        const textContent = parsed.content.find((c: { type: string }) => c.type === "text");
        if (textContent?.text) {
          parsed = JSON.parse(textContent.text);
        }
      }

      return <WeatherCard data={parsed} />;
    } catch (e) {
      console.error("[GetWeatherToolUI] parse error:", e, "result:", result);
      return (
        <div className="my-4 text-red-500 p-4 rounded-lg bg-red-50">
          Failed to parse weather data
        </div>
      );
    }
  },
});

/**
 * Tool UI for the compare_weather MCP tool.
 * Renders two weather cards side by side for comparison.
 */
export const CompareWeatherToolUI = makeAssistantToolUI<
  { location1: string; location2: string },
  string
>({
  toolName: "compare_weather",
  render: ({ result, status }) => {
    if (status.type === "running") {
      return (
        <div className="flex gap-4 my-4">
          <div className="animate-pulse bg-slate-200 rounded-2xl h-48 w-64" />
          <div className="animate-pulse bg-slate-200 rounded-2xl h-48 w-64" />
        </div>
      );
    }

    if (!result) return null;

    try {
      let parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Handle MCP result format
      if (parsed.content && Array.isArray(parsed.content)) {
        if (parsed.isError) {
          const errorText = parsed.content[0]?.text || "Unknown error";
          return (
            <div className="my-4 text-red-500 p-4 rounded-lg bg-red-50">
              Comparison error: {errorText}
            </div>
          );
        }
        const textContent = parsed.content.find((c: { type: string }) => c.type === "text");
        if (textContent?.text) {
          parsed = JSON.parse(textContent.text);
        }
      }

      return <WeatherComparison data={parsed} />;
    } catch (e) {
      console.error("[CompareWeatherToolUI] parse error:", e, "result:", result);
      return (
        <div className="my-4 text-red-500 p-4 rounded-lg bg-red-50">
          Failed to parse comparison data
        </div>
      );
    }
  },
});
