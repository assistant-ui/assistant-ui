import { Providers } from "./providers";
import { McpConfigDialog } from "@/components/assistant-ui/mcp-config";
import { ToolsPanel } from "./ToolsPanel";

export default function Home() {
  return (
    <Providers>
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-2xl tracking-tight">react-mcp</h1>
            <p className="text-muted-foreground text-sm">
              Connect MCP servers and inspect tools.
            </p>
          </div>
          <McpConfigDialog />
        </header>
        <ToolsPanel />
      </main>
    </Providers>
  );
}
