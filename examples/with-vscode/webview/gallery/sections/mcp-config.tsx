import { useMemo } from "react";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/react";
import { McpManagerResource } from "@assistant-ui/react-mcp";
import { McpConfigDialog } from "@assistant-ui/ui/components/assistant-ui/elements/mcp-config.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

function McpProviders({ children }: { children: React.ReactNode }) {
  const aui = useAui();
  const config = useMemo(
    () =>
      AuiConfig({
        mcp: McpManagerResource({
          autoConnect: false,
          connectors: [
            {
              id: "linear",
              name: "Linear",
              url: "https://mcp.linear.app/mcp",
              auth: { type: "oauth" },
            },
            {
              id: "github",
              name: "GitHub",
              url: "https://api.githubcopilot.com/mcp/",
              auth: { type: "bearer" },
            },
          ],
        }),
      }),
    [],
  );
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
}

export default defineSections([
  {
    id: "mcp-config",
    title: "MCP config dialog",
    category: "agents",
    notes:
      "mcp-config.aui.tsx under McpManagerResource with two connectors and autoConnect off, so nothing leaves the webview. The trigger opens the dialog (a portal outside this card): connectors, custom servers and the add form.",
    render: () => (
      <SeededRuntime>
        <McpProviders>
          <div className="flex flex-wrap items-center gap-3">
            <McpConfigDialog />
            <McpConfigDialog>
              <button type="button" className="text-xs underline">
                Custom trigger
              </button>
            </McpConfigDialog>
          </div>
        </McpProviders>
      </SeededRuntime>
    ),
  },
]);
