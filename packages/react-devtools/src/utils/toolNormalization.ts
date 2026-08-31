import { z } from "zod";
import { readProperty, UNSERIALIZABLE } from "./unserializable";

export type NormalizedTool = {
  name: string;
  type?: string;
  description?: string;
  disabled?: boolean;
  display?: string;
  providerId?: string;
  supportsDeferredResults?: boolean;
  backendDefault?: unknown;
  providerOptions?: unknown;
  providerArgs?: unknown;
  server?: unknown;
  parameters?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const toJsonSchema = (value: unknown): unknown => {
  try {
    if (value instanceof z.ZodType) {
      return z.toJSONSchema(value);
    }
  } catch {
    return value;
  }

  return value;
};

const mapToNormalizedTool = (
  name: string,
  raw: Record<string, unknown>,
): NormalizedTool => {
  const tool: NormalizedTool = { name };

  const type = readProperty(raw, "type");
  if (typeof type === "string") {
    tool.type = type;
  }

  const description = readProperty(raw, "description");
  if (typeof description === "string") {
    tool.description = description;
  }

  const disabled = readProperty(raw, "disabled");
  if (typeof disabled === "boolean") {
    tool.disabled = disabled;
  }

  const display = readProperty(raw, "display");
  if (typeof display === "string") {
    tool.display = display;
  }

  const providerId = readProperty(raw, "providerId");
  if (typeof providerId === "string") {
    tool.providerId = providerId;
  }

  const supportsDeferredResults = readProperty(raw, "supportsDeferredResults");
  if (typeof supportsDeferredResults === "boolean") {
    tool.supportsDeferredResults = supportsDeferredResults;
  }

  const backendDefault = readProperty(raw, "unstable_backendDefault");
  if (backendDefault !== undefined) {
    tool.backendDefault = backendDefault;
  }

  const providerOptions = readProperty(raw, "providerOptions");
  if (providerOptions !== undefined) {
    tool.providerOptions = providerOptions;
  }

  const providerArgs = readProperty(raw, "args");
  if (providerArgs !== undefined) {
    tool.providerArgs = providerArgs;
  }

  const server = readProperty(raw, "server");
  if (server !== undefined) {
    tool.server = server;
  }

  try {
    if (Object.hasOwn(raw, "parameters")) {
      tool.parameters = toJsonSchema(readProperty(raw, "parameters"));
    }
  } catch {
    tool.parameters = UNSERIALIZABLE;
  }

  return tool;
};

export const normalizeToolList = (value: unknown): NormalizedTool[] => {
  if (value === UNSERIALIZABLE) {
    return [{ name: UNSERIALIZABLE }];
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    const tools: NormalizedTool[] = [];
    const length = readProperty(value, "length");
    if (typeof length !== "number") return [{ name: UNSERIALIZABLE }];

    for (let index = 0; index < length; index++) {
      const entry = readProperty(value, index);
      if (entry === UNSERIALIZABLE) {
        tools.push({ name: UNSERIALIZABLE });
        continue;
      }
      if (!isRecord(entry)) continue;
      const name = readProperty(entry, "name");
      if (typeof name !== "string") continue;
      tools.push(mapToNormalizedTool(name, entry));
    }

    return tools;
  }

  if (isRecord(value)) {
    const tools: NormalizedTool[] = [];
    let names: string[];
    try {
      names = Object.keys(value);
    } catch {
      return [{ name: UNSERIALIZABLE }];
    }

    for (const name of names) {
      const entry = readProperty(value, name);
      if (!isRecord(entry)) {
        tools.push({ name });
        continue;
      }

      tools.push(mapToNormalizedTool(name, entry));
    }

    return tools;
  }

  return [];
};
