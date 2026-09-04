import { callTool, listTools, ToolError } from "./toolkit";
import type { JsonSchema, Toolkit } from "./types";

export type CliIo = {
  readonly argv: readonly string[];
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
};

const primaryType = (schema: JsonSchema) =>
  Array.isArray(schema.type) ? schema.type[0] : schema.type;

const coerce = (schema: JsonSchema, raw: string): unknown => {
  switch (primaryType(schema)) {
    case "number":
    case "integer": {
      const value = Number(raw);
      if (Number.isNaN(value))
        throw new ToolError(`expected a number, got "${raw}"`, "invalid_args");
      return value;
    }
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      throw new ToolError(
        `expected true or false, got "${raw}"`,
        "invalid_args",
      );
    case "string":
      return raw;
    default:
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
  }
};

export const parseToolArgs = (
  schema: JsonSchema,
  argv: readonly string[],
): Record<string, unknown> => {
  const properties = schema.properties ?? {};
  const args: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === "--json") {
      const raw = argv[++i];
      if (raw === undefined)
        throw new ToolError("--json requires a value", "invalid_args");
      Object.assign(args, JSON.parse(raw));
      continue;
    }
    if (!token.startsWith("--")) {
      throw new ToolError(`unexpected argument "${token}"`, "invalid_args");
    }
    const eq = token.indexOf("=");
    const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
    const property = properties[key];
    if (!property) throw new ToolError(`unknown flag --${key}`, "invalid_args");
    let raw: string | undefined;
    if (eq !== -1) raw = token.slice(eq + 1);
    else if (
      primaryType(property) === "boolean" &&
      !argv[i + 1]?.match(/^(true|false)$/)
    )
      raw = "true";
    else raw = argv[++i];
    if (raw === undefined)
      throw new ToolError(`--${key} requires a value`, "invalid_args");
    const value = coerce(property, raw);
    if (primaryType(property) === "array") {
      const existing = Array.isArray(args[key]) ? (args[key] as unknown[]) : [];
      args[key] = existing.concat(Array.isArray(value) ? value : [value]);
    } else {
      args[key] = value;
    }
  }
  return args;
};

const usage = (toolkit: Toolkit) => {
  const lines = [
    `usage: ${toolkit.name} <tool> [--flag value ...] [--json '{...}']`,
    "",
  ];
  if (toolkit.description) lines.push(toolkit.description, "");
  lines.push("tools:");
  for (const descriptor of listTools(toolkit)) {
    lines.push(`  ${descriptor.name.padEnd(20)} ${descriptor.description}`);
  }
  return lines.join("\n");
};

const toolUsage = (toolkit: Toolkit, name: string) => {
  const definition = toolkit.tools[name]!;
  const lines = [
    `usage: ${toolkit.name} ${name} [flags]`,
    "",
    definition.description,
    "",
  ];
  const required = new Set(definition.parameters.required ?? []);
  const properties = Object.entries(definition.parameters.properties ?? {});
  if (properties.length > 0) lines.push("flags:");
  for (const [key, property] of properties) {
    const type = String(property.type ?? "json");
    const marker = required.has(key) ? " (required)" : "";
    lines.push(
      `  --${key} <${type}>${marker}`.padEnd(32) + (property.description ?? ""),
    );
  }
  lines.push(
    "  --json <object>".padEnd(32) + "pass every argument as one JSON object",
  );
  return lines.join("\n");
};

export const runCli = async (toolkit: Toolkit, io: CliIo): Promise<number> => {
  const [command, ...rest] = io.argv;
  if (
    command === undefined ||
    command === "--help" ||
    command === "-h" ||
    command === "help"
  ) {
    io.stdout(usage(toolkit));
    return command === undefined ? 1 : 0;
  }
  if (command === "list") {
    io.stdout(JSON.stringify(listTools(toolkit), null, 2));
    return 0;
  }
  if (!Object.hasOwn(toolkit.tools, command)) {
    io.stderr(`unknown tool "${command}"\n\n${usage(toolkit)}`);
    return 1;
  }
  if (rest.includes("--help") || rest.includes("-h")) {
    io.stdout(toolUsage(toolkit, command));
    return 0;
  }
  try {
    const args = parseToolArgs(toolkit.tools[command]!.parameters, rest);
    const result = await callTool(toolkit, command, args);
    io.stdout(
      typeof result === "string" ? result : JSON.stringify(result, null, 2),
    );
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
};

export const serveCli = async (toolkit: Toolkit): Promise<void> => {
  const { argv, stdout, stderr, exit } = await import("node:process").then(
    (m) => m.default,
  );
  const code = await runCli(toolkit, {
    argv: argv.slice(2),
    stdout: (line) => stdout.write(line + "\n"),
    stderr: (line) => stderr.write(line + "\n"),
  });
  exit(code);
};
