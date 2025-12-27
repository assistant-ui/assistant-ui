"use client";

import * as React from "react";
import { useAssistantToolUI } from "@assistant-ui/react";
import { RemoteToolUI } from "./remote-tool-ui";
import {
  type UIManifest,
  UIManifestSchema,
  type MCPUICapability,
} from "../schemas/manifest";

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

interface LoadedManifest {
  manifest: UIManifest;
  baseUrl: string;
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
  const [manifests, setManifests] = React.useState<
    Record<string, LoadedManifest>
  >({});

  // Fetch manifests for all UI-enabled servers
  React.useEffect(() => {
    const loadManifests = async () => {
      const results: Record<string, LoadedManifest> = {};

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

            results[serverId] = {
              manifest,
              baseUrl: `https://${serverId}.auiusercontent.com`,
            };
          } catch (error) {
            console.warn(`Error loading manifest for ${serverId}:`, error);
          }
        }),
      );

      setManifests(results);
    };

    loadManifests();
  }, [servers]);

  // Register tool UIs for all loaded manifests
  return (
    <>
      {Object.entries(manifests).map(([serverId, { manifest, baseUrl }]) => (
        <ManifestToolUIRegistrar
          key={serverId}
          manifest={manifest}
          baseUrl={baseUrl}
          loadingFallback={loadingFallback}
          errorFallback={errorFallback}
        />
      ))}
      {children}
    </>
  );
};

interface ManifestToolUIRegistrarProps {
  manifest: UIManifest;
  baseUrl: string;
  loadingFallback?: React.ReactNode | undefined;
  errorFallback?: React.ReactNode | undefined;
}

const ManifestToolUIRegistrar: React.FC<ManifestToolUIRegistrarProps> = ({
  manifest,
  baseUrl,
  loadingFallback,
  errorFallback,
}) => {
  // Register a tool UI for each component's tool names
  for (const component of manifest.components) {
    for (const toolName of component.toolNames) {
      // Note: This hook is called in a loop which is not ideal,
      // but it's a workaround for dynamic tool registration
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useAssistantToolUI({
        toolName,
        render: ({ args, result, addResult }) => (
          <RemoteToolUI
            src={`${baseUrl}/render?component=${component.name}`}
            toolName={toolName}
            props={{ args, result }}
            onAddResult={addResult}
            fallback={loadingFallback}
            errorFallback={errorFallback}
          />
        ),
      });
    }
  }

  return null;
};
