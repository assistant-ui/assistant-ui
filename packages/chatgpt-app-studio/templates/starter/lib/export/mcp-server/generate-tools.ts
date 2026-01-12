import type { MCPToolConfig, GeneratedFile } from "./types";

function toSafeFileName(name: string): string {
  return (
    name
      .replace(/\.\./g, "")
      .replace(/[/\\]/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "tool"
  );
}

function toSafeIdentifier(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
  return safe || "tool";
}

export function generateToolHandler(tool: MCPToolConfig): string {
  const funcName = `${camelCase(toSafeIdentifier(tool.name))}Handler`;
  const defaultResponse = tool.defaultResponse ?? {
    structuredContent: {},
    content: `${tool.name} executed successfully`,
  };

  return `import type { ToolHandler } from "./types.js";

/**
 * Handler for the "${tool.name}" tool
 * ${tool.description || ""}
 *
 * TODO: Implement your business logic here.
 * The default response is based on your workbench mock data.
 */
export const ${funcName}: ToolHandler = async (args) => {
  // Your implementation here
  // Example: const data = await fetchFromDatabase(args);

  return {
    structuredContent: ${JSON.stringify(defaultResponse.structuredContent ?? {}, null, 4).replace(/\n/g, "\n    ")},
    content: [
      {
        type: "text" as const,
        text: ${JSON.stringify(defaultResponse.content || `${tool.name} completed`)},
      },
    ],
    _meta: ${JSON.stringify(defaultResponse._meta ?? {}, null, 4).replace(/\n/g, "\n    ")},
  };
};
`;
}

export function generateToolsIndex(tools: MCPToolConfig[]): string {
  const exports = tools
    .map((t) => {
      const safeHandler = camelCase(toSafeIdentifier(t.name));
      const safeFileName = toSafeFileName(t.name);
      return `export { ${safeHandler}Handler } from "./${safeFileName}.js";`;
    })
    .join("\n");

  return `${exports}
`;
}

export function generateToolTypes(): string {
  return `export interface ToolResult {
  [key: string]: unknown;
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: "text"; text: string }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  extra?: unknown
) => Promise<ToolResult>;
`;
}

function detectCollisions(tools: MCPToolConfig[]): {
  handlerCollisions: string[];
  fileCollisions: string[];
} {
  const handlerNames = new Map<string, string[]>();
  const fileNames = new Map<string, string[]>();

  for (const tool of tools) {
    const handlerName = `${camelCase(toSafeIdentifier(tool.name))}Handler`;
    const fileName = toSafeFileName(tool.name);

    const existingHandlers = handlerNames.get(handlerName) ?? [];
    existingHandlers.push(tool.name);
    handlerNames.set(handlerName, existingHandlers);

    const existingFiles = fileNames.get(fileName) ?? [];
    existingFiles.push(tool.name);
    fileNames.set(fileName, existingFiles);
  }

  const handlerCollisions: string[] = [];
  const fileCollisions: string[] = [];

  for (const [name, originals] of handlerNames) {
    if (originals.length > 1) {
      handlerCollisions.push(`${name} (from: ${originals.join(", ")})`);
    }
  }

  for (const [name, originals] of fileNames) {
    if (originals.length > 1) {
      fileCollisions.push(`${name}.ts (from: ${originals.join(", ")})`);
    }
  }

  return { handlerCollisions, fileCollisions };
}

export function generateToolFiles(tools: MCPToolConfig[]): GeneratedFile[] {
  const { handlerCollisions, fileCollisions } = detectCollisions(tools);

  if (handlerCollisions.length > 0 || fileCollisions.length > 0) {
    const messages: string[] = [];
    if (handlerCollisions.length > 0) {
      messages.push(`Handler name collisions: ${handlerCollisions.join("; ")}`);
    }
    if (fileCollisions.length > 0) {
      messages.push(`File name collisions: ${fileCollisions.join("; ")}`);
    }
    throw new Error(
      `Tool name collision detected. Please rename your tools to avoid conflicts.\n${messages.join("\n")}`,
    );
  }

  const files: GeneratedFile[] = [];

  files.push({
    path: "src/tools/types.ts",
    content: generateToolTypes(),
  });

  for (const tool of tools) {
    const safeFileName = toSafeFileName(tool.name);
    files.push({
      path: `src/tools/${safeFileName}.ts`,
      content: generateToolHandler(tool),
    });
  }

  files.push({
    path: "src/tools/index.ts",
    content: generateToolsIndex(tools),
  });

  return files;
}

function camelCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part, i) =>
      i === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
}
