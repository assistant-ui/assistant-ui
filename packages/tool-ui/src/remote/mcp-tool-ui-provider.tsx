"use client";

import * as React from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { RemoteToolUI } from "./remote-tool-ui";
import { UIManifestSchema, type MCPUICapability } from "../schemas/manifest";

export interface MCPToolUIProviderProps {
  /** MCP servers with UI capability */
  servers: Array<{
    serverId: string;
    capability: MCPUICapability;
  }>;
  /** Custom registry URL (default: registry.assistant-ui.com) */
  registryUrl?: string | undefined;
  /** Fallback component for loading state */
  loadingFallback?: React.ReactNode | undefined;
  /** Fallback component for errors */
  errorFallback?: React.ReactNode | undefined;
  children: React.ReactNode;
}

interface ToolUIComponent {
  toolName: string;
  Component: React.ComponentType;
}

/**
 * Provider that auto-discovers and loads UI components from MCP servers.
 *
 * @example
 * ```tsx
 * <MCPToolUIProvider
 *   servers={[
 *     { serverId: "weather-mcp", capability: server.capabilities.ui }
 *   ]}
 * >
 *   <Thread />
 * </MCPToolUIProvider>
 * ```
 */
export const MCPToolUIProvider: React.FC<MCPToolUIProviderProps> = ({
  servers,
  loadingFallback,
  errorFallback,
  children,
}) => {
  const [toolUIs, setToolUIs] = React.useState<ToolUIComponent[]>([]);

  // Fetch manifests and create tool UI components
  React.useEffect(() => {
    const loadManifests = async () => {
      const components: ToolUIComponent[] = [];

      await Promise.all(
        servers.map(async ({ serverId, capability }) => {
          try {
            const manifestUrl = `${capability.registry}/v1/servers/${serverId}/manifest.json`;
            const response = await fetch(manifestUrl);

            if (!response.ok) {
              console.warn(
                `Failed to fetch manifest for ${serverId}: ${response.status}`,
              );
              return;
            }

            const data = await response.json();
            const parseResult = UIManifestSchema.safeParse(data);

            if (!parseResult.success) {
              console.warn(
                `Invalid manifest for ${serverId}:`,
                parseResult.error,
              );
              return;
            }

            const manifest = parseResult.data;

            // Verify bundle hash matches capability declaration
            if (manifest.bundleHash !== capability.bundleHash) {
              console.warn(`Bundle hash mismatch for ${serverId}`);
              return;
            }

            // Derive baseUrl from the manifest's bundleUrl
            const bundleOrigin = new URL(manifest.bundleUrl).origin;

            // Create a tool UI component for each tool
            for (const component of manifest.components) {
              for (const toolName of component.toolNames) {
                const baseUrl = bundleOrigin;
                const componentName = component.name;
                const loading = loadingFallback;
                const error = errorFallback;

                // Create the tool UI component using makeAssistantToolUI
                const ToolUIComponent = makeAssistantToolUI({
                  toolName,
                  render: ({ args, result, addResult, status }) => {
                    if (status.type === "running") {
                      return (
                        loading ?? (
                          <div className="my-4 h-48 max-w-md animate-pulse rounded-2xl bg-slate-200" />
                        )
                      );
                    }

                    return (
                      <RemoteToolUI
                        src={`${baseUrl}/render?component=${componentName}`}
                        toolName={toolName}
                        props={{ args, result }}
                        onAddResult={addResult}
                        fallback={loading}
                        errorFallback={error}
                      />
                    );
                  },
                });

                components.push({
                  toolName,
                  Component: ToolUIComponent,
                });
              }
            }
          } catch (error) {
            console.warn(`Error loading manifest for ${serverId}:`, error);
          }
        }),
      );

      setToolUIs(components);
    };

    loadManifests();
  }, [servers, loadingFallback, errorFallback]);

  return (
    <>
      {/* Render all the tool UI components to register them */}
      {toolUIs.map(({ toolName, Component }) => (
        <Component key={toolName} />
      ))}
      {children}
    </>
  );
};
