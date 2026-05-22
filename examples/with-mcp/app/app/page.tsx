"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { McpConfigDialog } from "@/components/assistant-ui/mcp-config";
import { Providers } from "./providers";

export default function Home() {
  return (
    <Providers>
      <main className="grid h-dvh grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex flex-col">
            <h1 className="font-semibold text-base tracking-tight">
              react-mcp
            </h1>
            <p className="text-muted-foreground text-xs">
              Connect MCP servers, then chat — connected tools are exposed to
              the model automatically.
            </p>
          </div>
          <McpConfigDialog />
        </header>
        <Thread />
      </main>
    </Providers>
  );
}
