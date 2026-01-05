"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { WeatherCard } from "./weather-card";
import { WeatherComparison } from "./weather-comparison";

// Global state to track mode (simple approach for demo)
declare global {
  // eslint-disable-next-line no-var
  var __weatherMode__: boolean | undefined;
}
globalThis.__weatherMode__ = true;

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
        <div className="my-4 h-48 max-w-md animate-pulse rounded-2xl bg-slate-200" />
      );
    }

    // Parse the result
    if (!result) return null;

    try {
      // First parse if it's a string
      let parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Get current mode (default to AUI mode)
      const isAuiMode = globalThis.__weatherMode__ !== false;

      // Handle MCP result format: {content: [{type: "text", text: "..."}], isError: boolean}
      if (parsed.content && Array.isArray(parsed.content)) {
        // If there's an error, show error state
        if (parsed.isError) {
          const errorText = parsed.content[0]?.text || "Unknown error";
          return (
            <div className="my-4 rounded-lg bg-red-50 p-4 text-red-500">
              Weather error: {errorText}
            </div>
          );
        }
        // Extract the text content and parse it as JSON
        const textContent = parsed.content.find(
          (c: { type: string }) => c.type === "text",
        );
        if (textContent?.text) {
          // Legacy mode: show raw JSON
          if (!isAuiMode) {
            return (
              <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
                  {textContent.text}
                </pre>
              </div>
            );
          }
          parsed = JSON.parse(textContent.text);
        }
      }

      // Handle AUI component format: {component: "WeatherCard", props: {...}, text: "..."}
      if (parsed.component && parsed.props) {
        // Legacy mode: show raw JSON
        if (!isAuiMode) {
          return (
            <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
                {JSON.stringify(parsed.props, null, 2)}
              </pre>
            </div>
          );
        }
        parsed = parsed.props;
      }

      // Legacy mode fallback
      if (!isAuiMode) {
        return (
          <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      }

      return <WeatherCard data={parsed} />;
    } catch (e) {
      console.error("[GetWeatherToolUI] parse error:", e, "result:", result);
      return (
        <div className="my-4 rounded-lg bg-red-50 p-4 text-red-500">
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
        <div className="my-4 flex gap-4">
          <div className="h-48 w-64 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-48 w-64 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      );
    }

    if (!result) return null;

    try {
      let parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Get current mode (default to AUI mode)
      const isAuiMode = globalThis.__weatherMode__ !== false;

      // Handle MCP result format
      if (parsed.content && Array.isArray(parsed.content)) {
        if (parsed.isError) {
          const errorText = parsed.content[0]?.text || "Unknown error";
          return (
            <div className="my-4 rounded-lg bg-red-50 p-4 text-red-500">
              Comparison error: {errorText}
            </div>
          );
        }
        const textContent = parsed.content.find(
          (c: { type: string }) => c.type === "text",
        );
        if (textContent?.text) {
          // Legacy mode: show raw JSON
          if (!isAuiMode) {
            return (
              <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
                  {textContent.text}
                </pre>
              </div>
            );
          }
          parsed = JSON.parse(textContent.text);
        }
      }

      // Handle AUI component format: {component: "WeatherComparison", props: {...}, text: "..."}
      if (parsed.component && parsed.props) {
        // Legacy mode: show raw JSON
        if (!isAuiMode) {
          return (
            <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
                {JSON.stringify(parsed.props, null, 2)}
              </pre>
            </div>
          );
        }
        parsed = parsed.props;
      }

      // Legacy mode fallback
      if (!isAuiMode) {
        return (
          <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap font-mono text-slate-700 text-sm">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      }

      return <WeatherComparison data={parsed} />;
    } catch (e) {
      console.error(
        "[CompareWeatherToolUI] parse error:",
        e,
        "result:",
        result,
      );
      return (
        <div className="my-4 rounded-lg bg-red-50 p-4 text-red-500">
          Failed to parse comparison data
        </div>
      );
    }
  },
});
