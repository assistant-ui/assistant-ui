"use client";

import { type ReactNode, useCallback, useMemo } from "react";
import {
  MCPProvider,
  defineConnector,
  useMcpManager,
} from "@assistant-ui/react-mcp";
import {
  MCPAppProvider,
  type MCPAppBridgeHandlers,
  type MCPAppMetadata,
  type MCPAppResource,
} from "@assistant-ui/react";

const SERVER_ORIGIN =
  process.env.NEXT_PUBLIC_MCP_ORIGIN ?? "http://localhost:8788";

const connectors = [
  defineConnector({
    id: "aui-github",
    name: "GitHub",
    url: `${SERVER_ORIGIN}/mcp`,
    auth: { type: "oauth", scopes: ["mcp", "repo"] },
  }),
];

const MIME = "text/html;profile=mcp-app";

function AppProviderInner({ children }: { children: ReactNode }) {
  const mcp = useMcpManager();

  const loadResource = useCallback(
    async (app: MCPAppMetadata): Promise<MCPAppResource> => {
      const out = (await mcp
        .server({ id: "aui-github" })
        .readResource(app.resourceUri)) as {
        contents: { uri: string; mimeType?: string; text?: string }[];
      };
      const c =
        out.contents?.find((x) => x.uri === app.resourceUri) ??
        out.contents?.[0];
      return {
        uri: app.resourceUri,
        mimeType: MIME,
        html: c?.text ?? "",
      };
    },
    [mcp],
  );

  const handlers = useMemo<MCPAppBridgeHandlers>(
    () => ({
      callTool: async ({ name, arguments: args }) =>
        await mcp.server({ id: "aui-github" }).callTool(name, args),
      openLink: ({ url }) => {
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      },
    }),
    [mcp],
  );

  return (
    <MCPAppProvider
      loadResource={loadResource}
      handlers={handlers}
      hostInfo={{ name: "aui-github-showcase", version: "0.1.0" }}
      hostContext={{ theme: "light" }}
    >
      {children}
    </MCPAppProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MCPProvider
      connectors={connectors}
      oauthRedirectUri={
        typeof window !== "undefined"
          ? `${window.location.origin}/mcp/callback`
          : undefined
      }
    >
      <AppProviderInner>{children}</AppProviderInner>
    </MCPProvider>
  );
}
