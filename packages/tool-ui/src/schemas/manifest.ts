import { z } from "zod";

/**
 * Schema for a single component definition in the manifest.
 */
export const ComponentDefinitionSchema = z.object({
  /** Component name (used in tool results) */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** Tool names this component handles */
  toolNames: z.array(z.string()).min(1),
  /** Zod-compatible JSON Schema for props validation */
  propsSchema: z.record(z.unknown()).optional(),
});

export type ComponentDefinition = z.infer<typeof ComponentDefinitionSchema>;

/**
 * Schema for the complete UI manifest from an MCP server.
 */
export const UIManifestSchema = z.object({
  /** Manifest schema version */
  version: z.literal("1.0"),
  /** Unique server identifier */
  serverId: z.string().min(1),
  /** Human-readable server name */
  serverName: z.string().optional(),
  /** URL to the component bundle */
  bundleUrl: z.string().url(),
  /** SHA-256 hash of the bundle for integrity verification */
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Component definitions */
  components: z.array(ComponentDefinitionSchema).min(1),
  /** Required permissions */
  permissions: z
    .object({
      /** Allow network requests from component */
      network: z.boolean().default(false),
      /** Allow localStorage/sessionStorage */
      storage: z.boolean().default(false),
      /** Allow clipboard access */
      clipboard: z.boolean().default(false),
    })
    .default({}),
});

export type UIManifest = z.infer<typeof UIManifestSchema>;

/**
 * MCP server capability declaration for UI support.
 */
export const MCPUICapabilitySchema = z.object({
  /** UI capability version */
  version: z.literal("1.0"),
  /** Registry URL to fetch manifest from */
  registry: z.string().url(),
  /** Server ID in the registry */
  serverId: z.string().min(1),
  /** Bundle hash for verification */
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export type MCPUICapability = z.infer<typeof MCPUICapabilitySchema>;
