"use client";

import { useState, useEffect } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MCPToolUIProvider } from "@assistant-ui/tool-ui-server";

const WEATHER_MCP_CAPABILITY = {
  version: "1.0" as const,
  registry: "http://localhost:3001",
  serverId: "weather-mcp",
  bundleHash:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

export default function Home() {
  const runtime = useChatRuntime();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MCPToolUIProvider
        servers={[
          {
            serverId: "weather-mcp",
            capability: WEATHER_MCP_CAPABILITY,
          },
        ]}
        theme={theme}
        loadingFallback={
          <div className="my-4 h-48 max-w-md animate-pulse rounded-2xl bg-muted" />
        }
      >
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl">
            <header className="flex items-center justify-between border-border border-b bg-card p-4 shadow-sm dark:shadow-none">
              <div>
                <h1 className="font-semibold text-foreground text-xl">
                  Weather Assistant
                </h1>
                <p className="text-muted-foreground text-sm">
                  Ask about weather anywhere! Try: &quot;What&apos;s the weather
                  in Tokyo?&quot;
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  UI components loaded remotely via iframe
                </p>
              </div>
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted/80"
              >
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
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
