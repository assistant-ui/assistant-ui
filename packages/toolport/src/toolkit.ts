import type {
  JsonSchema,
  Tool,
  ToolContext,
  ToolDescriptor,
  Toolkit,
} from "./types";

export const tool = <Args, Result>(definition: Tool<Args, Result>) =>
  definition;

export const defineToolkit = <Tools extends Record<string, Tool>>(
  toolkit: Toolkit<Tools>,
): Toolkit<Tools> => toolkit;

export type ToolErrorCode =
  | "unknown_tool"
  | "invalid_args"
  | "execution_failed";

export class ToolError extends Error {
  readonly code: ToolErrorCode;

  constructor(message: string, code: ToolErrorCode) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export const listTools = (toolkit: Toolkit): ToolDescriptor[] =>
  Object.entries(toolkit.tools).map(([name, definition]) => ({
    name,
    description: definition.description,
    inputSchema: definition.parameters,
  }));

const typeOf = (value: unknown) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
};

const matchesType = (
  expected: string | string[] | undefined,
  value: unknown,
) => {
  if (expected === undefined) return true;
  const actual = typeOf(value);
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.some(
    (type) => type === actual || (type === "number" && actual === "integer"),
  );
};

export const validateArgs = (schema: JsonSchema, args: unknown): string[] => {
  const errors: string[] = [];
  if (!matchesType(schema.type ?? "object", args)) {
    return [`expected ${String(schema.type ?? "object")}, got ${typeOf(args)}`];
  }
  if (typeof args !== "object" || args === null || Array.isArray(args))
    return errors;
  const record = args as Record<string, unknown>;
  for (const key of schema.required ?? []) {
    if (record[key] === undefined)
      errors.push(`missing required argument "${key}"`);
  }
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    const value = record[key];
    if (value === undefined) continue;
    if (!matchesType(property.type, value)) {
      errors.push(
        `"${key}" expected ${String(property.type)}, got ${typeOf(value)}`,
      );
    }
    if (property.enum && !property.enum.includes(value)) {
      errors.push(
        `"${key}" must be one of ${property.enum.map(String).join(", ")}`,
      );
    }
  }
  return errors;
};

export const callTool = async (
  toolkit: Toolkit,
  name: string,
  args: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<unknown> => {
  const definition = Object.hasOwn(toolkit.tools, name)
    ? toolkit.tools[name]
    : undefined;
  if (!definition) {
    throw new ToolError(
      `unknown tool "${name}" in toolkit "${toolkit.name}"`,
      "unknown_tool",
    );
  }
  const errors = validateArgs(definition.parameters, args);
  if (errors.length > 0) throw new ToolError(errors.join("; "), "invalid_args");
  const ctx: ToolContext = {
    toolkit: toolkit.name,
    tool: name,
    signal: options.signal ?? new AbortController().signal,
  };
  try {
    return await definition.execute(args, ctx);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolError(message, "execution_failed");
  }
};
