import { z } from "zod";

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
  if (value instanceof z.ZodType) {
    try {
      return z.toJSONSchema(value);
    } catch {
      return value;
    }
  }

  return value;
};

const mapToNormalizedTool = (
  name: string,
  raw: Record<string, unknown>,
): NormalizedTool => {
  const tool: NormalizedTool = { name };

  if (typeof raw.type === "string") {
    tool.type = raw.type as string;
  }

  if (typeof raw.description === "string") {
    tool.description = raw.description as string;
  }

  if (typeof raw.disabled === "boolean") {
    tool.disabled = raw.disabled as boolean;
  }

  if (typeof raw.display === "string") {
    tool.display = raw.display as string;
  }

  if (typeof raw.providerId === "string") {
    tool.providerId = raw.providerId as string;
  }

  if (typeof raw.supportsDeferredResults === "boolean") {
    tool.supportsDeferredResults = raw.supportsDeferredResults as boolean;
  }

  if (raw.unstable_backendDefault !== undefined) {
    tool.backendDefault = raw.unstable_backendDefault;
  }

  if (raw.providerOptions !== undefined) {
    tool.providerOptions = raw.providerOptions;
  }

  if (raw.args !== undefined) {
    tool.providerArgs = raw.args;
  }

  if (raw.server !== undefined) {
    tool.server = raw.server;
  }

  if (Object.hasOwn(raw, "parameters")) {
    tool.parameters = toJsonSchema(raw.parameters);
  }

  return tool;
};

export const normalizeToolList = (value: unknown): NormalizedTool[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    const tools: NormalizedTool[] = [];

    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.name !== "string") continue;
      tools.push(mapToNormalizedTool(entry.name as string, entry));
    }

    return tools;
  }

  if (isRecord(value)) {
    const tools: NormalizedTool[] = [];

    for (const [name, entry] of Object.entries(value)) {
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
