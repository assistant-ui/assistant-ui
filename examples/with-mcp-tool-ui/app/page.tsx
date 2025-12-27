"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MCPToolUIProvider } from "@assistant-ui/tool-ui";

/**
 * This example demonstrates the remote Tool UI loading pattern.
 *
 * Instead of building tool UI components locally, the components are loaded
 * from an MCP server's UI bundle running on a separate origin. This enables
 * MCP server developers to ship their own UI that works automatically in
 * any assistant-ui application.
 *
 * To run this example:
 * 1. Start the UI server: cd ../mcp-weather-ui && pnpm dev:ui
 * 2. Start this app: pnpm dev
 *
 * The UI components run in a sandboxed iframe for security isolation.
 */

// Development configuration for the weather MCP server
// In production, this would come from the MCP server's capabilities
const WEATHER_MCP_CAPABILITY = {
  version: "1.0" as const,
  registry: "http://localhost:3001", // Local UI server
  serverId: "weather-mcp",
  bundleHash:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

export default function Home() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
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
        <main className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-4xl">
            <header className="border-b bg-white p-4 shadow-sm">
              <h1 className="font-semibold text-slate-900 text-xl">
                Weather Assistant
              </h1>
              <p className="text-slate-500 text-sm">
                Ask about weather anywhere! Try: &quot;What&apos;s the weather
                in Tokyo?&quot;
              </p>
              <p className="mt-1 text-slate-400 text-xs">
                UI components loaded remotely from MCP server (iframe-isolated)
              </p>
            </header>
            <div className="h-[calc(100vh-100px)]">
              <Thread />
            </div>
          </div>
        </main>
      </MCPToolUIProvider>
    </AssistantRuntimeProvider>
  );
}
