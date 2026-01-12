import path from "node:path";
import fs from "node:fs/promises";
import type {
  MCPServerConfig,
  MCPServerGeneratorOptions,
  MCPServerGeneratorResult,
  GeneratedFile,
} from "./types";
import { generateServerEntry } from "./generate-server";
import { generateToolFiles } from "./generate-tools";
import { generateConfigFiles } from "./generate-configs";

export type {
  MCPServerConfig,
  MCPToolConfig,
  MCPServerGeneratorOptions,
  MCPServerGeneratorResult,
  GeneratedFile,
} from "./types";

export async function generateMCPServer(
  options: MCPServerGeneratorOptions,
): Promise<MCPServerGeneratorResult> {
  const { config, outputDir } = options;
  const files: GeneratedFile[] = [];
  const errors: string[] = [];

  try {
    // Generate server entry point
    files.push({
      path: "src/index.ts",
      content: generateServerEntry(config),
    });

    // Generate tool handlers
    const toolFiles = generateToolFiles(config.tools);
    files.push(...toolFiles);

    // Generate config files
    const configFiles = generateConfigFiles(config);
    files.push(...configFiles);

    // Write all files
    for (const file of files) {
      const fullPath = path.join(outputDir, file.path);
      const dir = path.dirname(fullPath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, file.content, "utf-8");
    }

    return {
      success: true,
      files,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to generate MCP server: ${message}`);
    return {
      success: false,
      files,
      errors,
    };
  }
}

export function extractToolsFromMockConfig(
  mockConfig: Record<string, unknown>,
): MCPServerConfig["tools"] {
  const tools: MCPServerConfig["tools"] = [];

  if (!mockConfig || typeof mockConfig !== "object") {
    return tools;
  }

  const toolsRecord = mockConfig as Record<
    string,
    {
      toolName: string;
      variants?: Array<{
        id: string;
        response?: {
          structuredContent?: Record<string, unknown>;
          content?: string;
          _meta?: Record<string, unknown>;
        };
      }>;
      activeVariantId?: string | null;
      annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        openWorldHint?: boolean;
        idempotentHint?: boolean;
      };
      descriptorMeta?: {
        "openai/outputTemplate"?: string;
        "openai/widgetAccessible"?: boolean;
        "openai/visibility"?: "public" | "private";
        "openai/toolInvocation/invoking"?: string;
        "openai/toolInvocation/invoked"?: string;
      };
      schemas?: {
        inputSchema?: Record<string, unknown>;
        outputSchema?: Record<string, unknown>;
      };
    }
  >;

  for (const [, toolConfig] of Object.entries(toolsRecord)) {
    if (!toolConfig || typeof toolConfig !== "object" || !toolConfig.toolName) {
      continue;
    }

    const activeVariant = toolConfig.variants?.find(
      (v) => v.id === toolConfig.activeVariantId,
    );

    tools.push({
      name: toolConfig.toolName,
      title: toolConfig.toolName.replace(/[-_]/g, " "),
      inputSchema: toolConfig.schemas?.inputSchema,
      outputSchema: toolConfig.schemas?.outputSchema,
      annotations: toolConfig.annotations,
      meta: toolConfig.descriptorMeta,
      defaultResponse: activeVariant?.response,
    });
  }

  return tools;
}
