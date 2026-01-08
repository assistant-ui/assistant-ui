import type { z } from "zod";
import type { ToolAnnotations, ToolInvocationMessages } from "./types/protocol";
import type {
  SecurityScheme,
  ToolExecutionContext,
  OAuthResourceServerConfig,
} from "./types/oauth";

/**
 * Configuration for a tool with UI component.
 */
export interface ToolWithUIConfig<TArgs extends z.ZodType, TResult> {
  /** Tool name (must be unique within server) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for tool arguments */
  parameters: TArgs;
  /** UI component name to render results */
  component: string;
  /** Execute the tool */
  execute: (
    args: z.infer<TArgs>,
    context?: ToolExecutionContext,
  ) => Promise<TResult>;
  /** Transform result into component props (optional) */
  transformResult?:
    | ((result: TResult, args: z.infer<TArgs>) => Record<string, unknown>)
    | undefined;
  /** Tool annotations for ChatGPT Apps SDK compatibility (optional) */
  annotations?: ToolAnnotations;

  // Tool metadata properties for ChatGPT Apps SDK compatibility
  /** Invocation status messages (max 64 chars each) */
  invocationMessages?: ToolInvocationMessages;
  /** Tool visibility - private tools are hidden from model discovery */
  visibility?: "private" | "public";
  /** Whether tool can be called from widgets */
  widgetAccessible?: boolean;
  /** File parameter names that accept file uploads */
  fileParams?: string[];

  // NEW: OAuth Security Schemes
  /**
   * Security schemes for this tool.
   * - `[{ type: "noauth" }]` - Tool is publicly accessible
   * - `[{ type: "oauth2", scopes: ["read"] }]` - Requires OAuth with scopes
   * - `[{ type: "noauth" }, { type: "oauth2", scopes: ["read"] }]` - Optional auth
   *
   * If omitted, inherits from server default (typically noauth).
   */
  securitySchemes?: SecurityScheme[];
}

/**
 * Server options for creating a UI-enabled MCP server.
 */
export interface ToolUIServerOptions {
  /** Unique server identifier */
  serverId: string;
  /** Human-readable name */
  name: string;
  /** Server version */
  version: string;
  /** Registry URL for UI manifests */
  registryUrl?: string | undefined;
  /** Bundle hash for integrity verification */
  bundleHash: string;

  /**
   * OAuth configuration for this resource server.
   * When provided, enables OAuth authentication support:
   * - Exposes /.well-known/oauth-protected-resource metadata
   * - Enables per-tool security scheme validation
   * - Adds token validation utilities to tool context
   */
  oauth?: OAuthResourceServerConfig;
}

/**
 * UI capability object for MCP initialization.
 */
export interface UICapability {
  version: "1.0";
  registry: string;
  serverId: string;
  bundleHash: string;
}

/**
 * UI manifest for registry publication.
 */
export interface UIManifest {
  version: "1.0";
  serverId: string;
  serverName: string;
  bundleUrl: string;
  bundleHash: string;
  components: Array<{
    name: string;
    toolNames: string[];
  }>;
  permissions: {
    network: boolean;
    storage: boolean;
    clipboard: boolean;
  };
}
