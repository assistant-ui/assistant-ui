"use client";

import * as React from "react";
import { makeAssistantToolUI, useAssistantApi } from "@assistant-ui/react";
import { RemoteToolUI } from "./remote-tool-ui";
import { UIManifestSchema, type MCPUICapability } from "../schemas/manifest";
import type {
  DisplayMode,
  Theme,
  WidgetState,
  CallToolResponse,
  ModalOptions,
} from "../types/protocol";

const ToolUIThemeContext = React.createContext<Theme>("light");
const CallToolContext = React.createContext<
  | ((name: string, args: Record<string, unknown>) => Promise<CallToolResponse>)
  | null
>(null);

export interface MCPToolUIProviderProps {
  /** MCP servers with UI capability */
  servers: Array<{
    serverId: string;
    capability: MCPUICapability;
  }>;
  /** Custom registry URL (default: registry.assistant-ui.com) */
  registryUrl?: string | undefined;
  /** Theme for tool UIs */
  theme?: Theme | undefined;
  /** Fallback component for loading state */
  loadingFallback?: React.ReactNode | undefined;
  /** Fallback component for errors */
  errorFallback?: React.ReactNode | undefined;
  /** Handler for calling tools from within widgets */
  onCallTool?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  /** Handler for modal requests from widgets */
  onRequestModal?: (options: ModalOptions) => Promise<void>;
  /** Handler for close requests from widgets */
  onRequestClose?: () => void;
  children: React.ReactNode;
}

interface ToolUIComponent {
  toolName: string;
  serverId: string;
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
  registryUrl,
  theme = "light",
  loadingFallback,
  errorFallback,
  onCallTool,
  onRequestModal,
  onRequestClose,
  children,
}) => {
  const [toolUIs, setToolUIs] = React.useState<ToolUIComponent[]>([]);

  const fallbackRefs = React.useRef({ loadingFallback, errorFallback });
  fallbackRefs.current = { loadingFallback, errorFallback };

  const callToolRef = React.useRef(onCallTool);
  callToolRef.current = onCallTool;

  const requestModalRef = React.useRef(onRequestModal);
  requestModalRef.current = onRequestModal;

  const requestCloseRef = React.useRef(onRequestClose);
  requestCloseRef.current = onRequestClose;

  const serversKey = React.useMemo(
    () =>
      servers.map((s) => `${s.serverId}:${s.capability.bundleHash}`).join(","),
    [servers],
  );

  // Fetch manifests and create tool UI components
  React.useEffect(() => {
    const loadManifests = async () => {
      const components: ToolUIComponent[] = [];

      await Promise.all(
        servers.map(async ({ serverId, capability }) => {
          try {
            const manifestUrl = `${registryUrl ?? capability.registry}/v1/servers/${serverId}/manifest.json`;
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

                const ToolUIComponent = makeAssistantToolUI({
                  toolName,
                  render: function ToolUIRenderer({
                    args,
                    result,
                    addResult,
                    status,
                  }) {
                    const api = useAssistantApi();
                    const currentTheme = React.useContext(ToolUIThemeContext);
                    const callToolHandler = React.useContext(CallToolContext);
                    const [widgetState, setWidgetState] =
                      React.useState<WidgetState>(null);

                    const handleCallTool = React.useCallback(
                      async (
                        name: string,
                        toolArgs: Record<string, unknown>,
                      ) => {
                        if (!callToolHandler) {
                          throw new Error("callTool not configured");
                        }
                        return callToolHandler(name, toolArgs);
                      },
                      [callToolHandler],
                    );

                    const handleSendFollowUpMessage = React.useCallback(
                      async (payload: { prompt: string }) => {
                        api.thread().append({
                          role: "user",
                          content: [{ type: "text", text: payload.prompt }],
                        });
                      },
                      [api],
                    );

                    const handleRequestDisplayMode = React.useCallback(
                      async (payload: { mode: DisplayMode }) => {
                        return { mode: payload.mode };
                      },
                      [],
                    );

                    const handleRequestModal = React.useCallback(
                      async (options: ModalOptions) => {
                        if (requestModalRef.current) {
                          return requestModalRef.current(options);
                        }
                        console.log("[Tool UI] Modal requested:", options);
                      },
                      [],
                    );

                    const handleRequestClose = React.useCallback(() => {
                      if (requestCloseRef.current) {
                        requestCloseRef.current();
                      }
                    }, []);

                    const { loadingFallback: loading, errorFallback: error } =
                      fallbackRefs.current;

                    if (status.type === "running") {
                      return (
                        <div className="mb-4">
                          {loading ?? (
                            <div className="h-24 max-w-md animate-pulse rounded-2xl bg-slate-200" />
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="mb-4">
                        <RemoteToolUI
                          src={`${baseUrl}/render?component=${encodeURIComponent(componentName)}`}
                          toolName={toolName}
                          toolInput={args as Record<string, unknown>}
                          toolOutput={result as Record<string, unknown> | null}
                          theme={currentTheme}
                          widgetState={widgetState}
                          onWidgetStateChange={setWidgetState}
                          onCallTool={
                            callToolHandler ? handleCallTool : undefined
                          }
                          onSendFollowUpMessage={handleSendFollowUpMessage}
                          onRequestDisplayMode={handleRequestDisplayMode}
                          onRequestModal={handleRequestModal}
                          onRequestClose={handleRequestClose}
                          onAddResult={addResult}
                          fallback={loading}
                          errorFallback={error}
                        />
                      </div>
                    );
                  },
                });

                components.push({
                  toolName,
                  serverId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serversKey, registryUrl]);

  return (
    <ToolUIThemeContext.Provider value={theme}>
      <CallToolContext.Provider value={onCallTool ?? null}>
        {toolUIs.map(({ toolName, serverId, Component }) => (
          <Component key={`${serverId}-${toolName}`} />
        ))}
        {children}
      </CallToolContext.Provider>
    </ToolUIThemeContext.Provider>
  );
};
