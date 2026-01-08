import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { z } from "zod";
import type {
  ToolUIServerOptions,
  ToolWithUIConfig,
  UICapability,
  UIManifest,
} from "./types";
import {
  createProtectedResourceMetadataHandler,
  isProtectedResourceMetadataRequest,
} from "./oauth/metadata-handler";
import { collectScopesFromTools } from "./oauth/protected-resource-metadata";

/**
 * Create an MCP server with UI capability.
 *
 * @example
 * ```typescript
 * const { server, toolWithUI, start } = createToolUIServer({
 *   serverId: "weather-mcp",
 *   name: "Weather MCP",
 *   version: "1.0.0",
 *   bundleHash: "sha256:abc123...",
 * });
 *
 * toolWithUI({
 *   name: "get_weather",
 *   description: "Get weather for a location",
 *   parameters: z.object({ location: z.string() }),
 *   component: "WeatherCard",
 *   execute: async ({ location }) => fetchWeather(location),
 * });
 *
 * await start();
 * ```
 */
export function createToolUIServer(options: ToolUIServerOptions) {
  const {
    serverId,
    name,
    version,
    registryUrl = "https://registry.assistant-ui.com",
    bundleHash,
    oauth,
  } = options;

  const server = new McpServer({
    name,
    version,
  });

  // Track registered components for manifest generation
  const components: Array<{
    name: string;
    toolNames: string[];
  }> = [];

  /**
   * Register a tool with UI component.
   */
  function toolWithUI<TArgs extends z.ZodType, TResult>(
    config: ToolWithUIConfig<TArgs, TResult>,
  ) {
    const {
      name: toolName,
      description,
      parameters,
      component,
      execute,
      transformResult,
    } = config;

    // Track component registration
    const existingComponent = components.find((c) => c.name === component);
    if (existingComponent) {
      existingComponent.toolNames.push(toolName);
    } else {
      components.push({ name: component, toolNames: [toolName] });
    }

    // Register tool with MCP server
    // MCP SDK expects ZodRawShape (the .shape property) not the full ZodObject
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (parameters as any).shape ?? parameters;
    server.tool(toolName, description, shape, async (args: unknown) => {
      // Validate arguments
      const parseResult = parameters.safeParse(args);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid arguments: ${parseResult.error.message}`,
            },
          ],
          isError: true,
        };
      }

      // Execute tool
      const result = await execute(parseResult.data);

      // Transform result for UI
      const componentProps = transformResult
        ? transformResult(result, parseResult.data)
        : result;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
        // Extended result with UI metadata (this would need MCP protocol extension)
        _ui: {
          component,
          props: componentProps,
        },
      };
    });
  }

  /**
   * Get the UI capability object for initialization.
   */
  function getUICapability(): UICapability {
    return {
      version: "1.0" as const,
      registry: registryUrl,
      serverId,
      bundleHash,
    };
  }

  /**
   * Generate manifest for registry publication.
   */
  function generateManifest(): UIManifest {
    return {
      version: "1.0" as const,
      serverId,
      serverName: name,
      bundleUrl: `https://${serverId}.auiusercontent.com/bundle.js`,
      bundleHash,
      components: components.map((c) => ({
        name: c.name,
        toolNames: c.toolNames,
      })),
      permissions: {
        network: false,
        storage: false,
        clipboard: false,
      },
    };
  }

  /**
   * Start the server with stdio transport.
   */
  async function start() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  // Auto-collect scopes from tools if not specified
  let oauthConfig = oauth;
  if (oauthConfig && !oauthConfig.scopesSupported) {
    oauthConfig = {
      ...oauthConfig,
      scopesSupported: collectScopesFromTools([]), // TODO: Track registered tools
    };
  }

  // Create metadata handler if OAuth is configured
  const metadataHandler = oauthConfig
    ? createProtectedResourceMetadataHandler(oauthConfig)
    : null;

  return {
    server,
    toolWithUI,
    getUICapability,
    generateManifest,
    start,

    /**
     * Handle OAuth metadata requests
     * Call this before your MCP handler for HTTP transports
     */
    handleOAuthMetadata: metadataHandler,

    /**
     * Check if a request is for OAuth metadata
     */
    isOAuthMetadataRequest: isProtectedResourceMetadataRequest,

    /**
     * OAuth configuration (if enabled)
     */
    oauthConfig,
  };
}
