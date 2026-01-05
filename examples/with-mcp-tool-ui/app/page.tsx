"use client";

import { useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MCPToolUIProvider } from "@assistant-ui/tool-ui";
import {
  GetWeatherToolUI,
  CompareWeatherToolUI,
} from "@/components/weather-tool-uis";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * This example demonstrates the remote Tool UI loading pattern.
 *
 * In AUI mode: UI components are loaded from an MCP server's UI bundle
 * running on a separate origin (iframe-isolated for security).
 *
 * In Legacy mode: Shows raw JSON data instead of rich components.
 *
 * To run this example:
 * 1. Start the UI server: cd ../mcp-weather-ui && pnpm build:ui && pnpm start:ui
 * 2. Start this app: pnpm dev
 */

// Development configuration for the weather MCP server
const WEATHER_MCP_CAPABILITY = {
  version: "1.0" as const,
  registry: "http://localhost:3001", // Local UI server
  serverId: "weather-mcp",
  bundleHash:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

export default function Home() {
  const runtime = useChatRuntime();
  const [isAuiMode, setIsAuiMode] = useState(true);

  const handleModeChange = (newMode: boolean) => {
    setIsAuiMode(newMode);
    // Update global mode state for legacy components
    (globalThis as unknown as { __weatherMode__: boolean }).__weatherMode__ =
      newMode;
    console.log(
      `Mode changed to: ${newMode ? "AUI (iframe)" : "Legacy (JSON)"}`,
    );
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* 
        When in AUI mode: Use MCPToolUIProvider for remote iframe loading
        When in Legacy mode: Use local components that show raw JSON
      */}
      {isAuiMode ? (
        <MCPToolUIProvider
          servers={[
            {
              serverId: "weather-mcp",
              capability: WEATHER_MCP_CAPABILITY,
            },
          ]}
          loadingFallback={
            <div className="my-4 h-48 max-w-md animate-pulse rounded-2xl bg-slate-200" />
          }
        >
          <MainContent isAuiMode={isAuiMode} onModeChange={handleModeChange} />
        </MCPToolUIProvider>
      ) : (
        <>
          <GetWeatherToolUI />
          <CompareWeatherToolUI />
          <MainContent isAuiMode={isAuiMode} onModeChange={handleModeChange} />
        </>
      )}
    </AssistantRuntimeProvider>
  );
}

function MainContent({
  isAuiMode,
  onModeChange,
}: {
  isAuiMode: boolean;
  onModeChange: (mode: boolean) => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b bg-white p-4 shadow-sm">
          <div>
            <h1 className="font-semibold text-slate-900 text-xl">
              Weather Assistant
            </h1>
            <p className="text-slate-500 text-sm">
              Ask about weather anywhere! Try: &quot;What&apos;s the weather in
              Tokyo?&quot;
            </p>
            <p className="mt-1 text-slate-400 text-xs">
              {isAuiMode
                ? "UI components loaded remotely via iframe"
                : "Showing raw JSON responses"}
            </p>
          </div>
          <ModeToggle onModeChange={onModeChange} />
        </header>
        <div className="h-[calc(100vh-100px)]">
          <Thread />
        </div>
      </div>
    </main>
  );
}
