import type { z } from "zod";

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
  execute: (args: z.infer<TArgs>) => Promise<TResult>;
  /** Transform result into component props (optional) */
  transformResult?:
    | ((result: TResult, args: z.infer<TArgs>) => Record<string, unknown>)
    | undefined;
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
