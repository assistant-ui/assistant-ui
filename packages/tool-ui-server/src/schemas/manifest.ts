import { z } from "zod";
import { ToolAnnotationsSchema } from "./shared";

export const ComponentDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  toolNames: z.array(z.string()).min(1),
  propsSchema: z.record(z.unknown()).optional(),
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  defaultDisplayMode: z.enum(["inline", "fullscreen", "pip"]).default("inline"),
  prefersBorder: z.boolean().optional(),
  annotations: ToolAnnotationsSchema.optional(),
});

export type ComponentDefinition = z.infer<typeof ComponentDefinitionSchema>;

export const UIManifestSchema = z.object({
  version: z.literal("1.0"),
  serverId: z.string().min(1),
  serverName: z.string().optional(),
  bundleUrl: z.string().url(),
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  components: z.array(ComponentDefinitionSchema).min(1),
  permissions: z
    .object({
      network: z.boolean().default(false),
      storage: z.boolean().default(false),
      clipboard: z.boolean().default(false),
      callTools: z.boolean().default(false),
      displayMode: z.boolean().default(false),
      followUpMessages: z.boolean().default(false),
      modals: z.boolean().default(false),
    })
    .default({}),
});

export type UIManifest = z.infer<typeof UIManifestSchema>;

export const MCPUICapabilitySchema = z.object({
  version: z.literal("1.0"),
  registry: z.string().url(),
  serverId: z.string().min(1),
  bundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export type MCPUICapability = z.infer<typeof MCPUICapabilitySchema>;
