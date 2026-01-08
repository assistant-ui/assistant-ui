"use client";

import { useState, useEffect, useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MCPToolUIProvider } from "@assistant-ui/tool-ui-server";
import type {
  CallToolResponse,
  ModalOptions,
} from "@assistant-ui/tool-ui-server";

const WEATHER_MCP_CAPABILITY = {
  version: "1.0" as const,
  registry: "http://localhost:3001",
  serverId: "weather-mcp",
  bundleHash:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

interface MockUser {
  id: string;
  email: string;
  name: string;
}

export default function Home() {
  const runtime = useChatRuntime();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<MockUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      console.log(
        "[OAuth Demo] Access token available:",
        accessToken.slice(0, 20) + "...",
      );
    }
  }, [accessToken]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const handleSignIn = () => {
    const mockUser: MockUser = {
      id: "user_12345",
      email: "demo@example.com",
      name: "Demo User",
    };
    const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setUser(mockUser);
    setAccessToken(mockToken);
    console.log("[OAuth] Signed in:", { user: mockUser, token: mockToken });
  };

  const handleSignOut = () => {
    setUser(null);
    setAccessToken(null);
    console.log("[OAuth] Signed out");
  };

  const handleCallTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      console.log(`[callTool] Calling ${name} with args:`, args);
      const response = await fetch("/api/call-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, args }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Tool call failed");
      }
      console.log(`[callTool] ${name} result:`, data);
      return data;
    },
    [],
  );

  const handleRequestModal = useCallback(async (options: ModalOptions) => {
    console.log("[Modal] Requested:", options);
    alert(
      `Modal requested:\n\nTitle: ${options.title}\nParams: ${JSON.stringify(options.params, null, 2)}`,
    );
  }, []);

  const handleRequestClose = useCallback(() => {
    console.log("[Widget] Close requested");
  }, []);

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
        onCallTool={handleCallTool}
        onRequestModal={handleRequestModal}
        onRequestClose={handleRequestClose}
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
              <div className="flex items-center gap-2">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium text-foreground text-sm">
                        {user.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 font-medium text-red-700 text-sm transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700"
                  >
                    🔐 Sign In (OAuth)
                  </button>
                )}
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted/80"
                >
                  {theme === "dark" ? "🌙" : "☀️"}
                </button>
              </div>
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
