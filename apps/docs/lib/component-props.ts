import { toJSONSchema } from "assistant-stream";
import type { GenerativeUIComponent } from "@assistant-ui/react-generative-ui";

export type PropRow = {
  name: string;
  required: boolean;
  type: string;
  enumValues?: string[];
  description?: string;
};

type JsonSchemaLike = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchemaLike[];
  oneOf?: JsonSchemaLike[];
  properties?: Record<string, JsonSchemaLike>;
  required?: string[];
  description?: string;
};

function describeSchema(schema: JsonSchemaLike): {
  type: string;
  enumValues?: string[];
} {
  if (Array.isArray(schema.enum)) {
    return {
      type: "enum",
      enumValues: schema.enum.map(String),
    };
  }

  if (schema.const !== undefined) {
    return {
      type: "enum",
      enumValues: [String(schema.const)],
    };
  }

  const unions = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(unions) && unions.length > 0) {
    const members = unions.map(describeSchema);
    const enumValues = members.flatMap((member) => member.enumValues ?? []);
    return {
      type: members.map((member) => member.type).join(" | "),
      ...(enumValues.length > 0 ? { enumValues } : {}),
    };
  }

  if (Array.isArray(schema.type)) {
    return { type: schema.type.join(" | ") };
  }

  if (schema.type === "array") return { type: "array" };
  if (schema.type === "object") return { type: "object" };
  if (typeof schema.type === "string") return { type: schema.type };

  return { type: "unknown" };
}

export function describeComponentProps(
  entry: GenerativeUIComponent,
): PropRow[] {
  try {
    const schema = toJSONSchema(entry.properties) as JsonSchemaLike;
    if (schema.type !== "object" || !schema.properties) return [];

    const required = new Set(schema.required ?? []);

    return Object.entries(schema.properties).map(([name, propSchema]) => {
      const described = describeSchema(propSchema ?? {});
      return {
        name,
        required: required.has(name),
        type: described.type,
        ...(described.enumValues ? { enumValues: described.enumValues } : {}),
        ...(typeof propSchema?.description === "string"
          ? { description: propSchema.description }
          : {}),
      };
    });
  } catch {
    return [];
  }
}
