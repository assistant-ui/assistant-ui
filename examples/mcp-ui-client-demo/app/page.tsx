"use client";

import { useState, useEffect, useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { MCPToolUIProvider } from "@assistant-ui/tool-ui-server";
import type { MCPUICapability } from "@assistant-ui/tool-ui-server";
import type {
  ModalOptions,
  CallToolResponse,
} from "@assistant-ui/tool-ui-server";

const WEATHER_MCP_CAPABILITY: MCPUICapability = {
  version: "1.0",
  registry: "http://localhost:3001",
  serverId: "weather-mcp",
  bundleHash:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

export default function Home() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const handleRequestModal = useCallback(async (options: ModalOptions) => {
    console.log("[Modal] Requested:", options);
    alert(
      `Modal requested:\n\nTitle: ${options.title}\nParams: ${JSON.stringify(options.params, null, 2)}`,
    );
  }, []);

  const handleRequestClose = useCallback(() => {
    console.log("[Widget] Close requested");
  }, []);

  const handleCallTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      console.log("[CallTool] Widget calling tool:", name, args);
      return {
        content: `Tool ${name} called with args: ${JSON.stringify(args)}`,
      };
    },
    [],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MCPToolUIProvider
        servers={[
          { serverId: "weather-mcp", capability: WEATHER_MCP_CAPABILITY },
        ]}
        theme={theme}
        onRequestModal={handleRequestModal}
        onRequestClose={handleRequestClose}
        onCallTool={handleCallTool}
        loadingFallback={
          <div className="h-24 max-w-md animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
        }
        errorFallback={
          <div className="max-w-md rounded-2xl bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-400">
            Failed to load widget. Is the UI server running?
          </div>
        }
      >
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl">
            <header className="sticky top-0 z-10 border-border border-b bg-card shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h1 className="font-semibold text-foreground text-xl">
                    MCP AUI Demo
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Ask about weather to see inline tool UI rendering
                  </p>
                </div>
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted/80"
                >
                  {theme === "dark" ? "Dark" : "Light"}
                </button>
              </div>

              <div className="border-border border-t bg-muted/30 px-4 py-2">
                <p className="text-muted-foreground text-xs">
                  Try: &quot;What&apos;s the weather in San Francisco?&quot; or
                  &quot;Compare weather in NYC and LA&quot;
                </p>
              </div>
            </header>

            <div className="h-[calc(100vh-120px)]">
              <Thread />
            </div>
          </div>
        </main>
      </MCPToolUIProvider>
    </AssistantRuntimeProvider>
  );
}
