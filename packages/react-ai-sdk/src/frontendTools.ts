import { jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";

export const frontendTools = (
  tools: Record<string, { description?: string; parameters: JSONSchema7 }>,
) =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        inputSchema: jsonSchema(tool.parameters),
      },
    ]),
  );
