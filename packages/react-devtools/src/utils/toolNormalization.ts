import { z } from "zod";
import { UNSERIALIZABLE, readSafely } from "./common";

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

type StringToolProperty = "type" | "description" | "display" | "providerId";
type BooleanToolProperty = "disabled" | "supportsDeferredResults";
type UnknownToolProperty =
  | "backendDefault"
  | "providerOptions"
  | "providerArgs"
  | "server";

const setStringProperty = (
  tool: NormalizedTool,
  raw: Record<string, unknown>,
  key: StringToolProperty,
) => {
  const value = readSafely(() => raw[key]);
  if (!value.readable) {
    tool[key] = UNSERIALIZABLE;
  } else if (typeof value.value === "string") {
    tool[key] = value.value;
  }
};

const setBooleanProperty = (
  tool: NormalizedTool,
  raw: Record<string, unknown>,
  key: BooleanToolProperty,
) => {
  const value = readSafely(() => raw[key]);
  if (value.readable && typeof value.value === "boolean") {
    tool[key] = value.value;
  }
};

const setUnknownProperty = (
  tool: NormalizedTool,
  raw: Record<string, unknown>,
  rawKey: string,
  key: UnknownToolProperty,
) => {
  const value = readSafely(() => raw[rawKey]);
  if (!value.readable) {
    tool[key] = UNSERIALIZABLE;
  } else if (value.value !== undefined) {
    tool[key] = value.value;
  }
};

const mapToNormalizedTool = (
  name: string,
  raw: Record<string, unknown>,
): NormalizedTool => {
  const tool: NormalizedTool = { name };

  setStringProperty(tool, raw, "type");
  setStringProperty(tool, raw, "description");
  setBooleanProperty(tool, raw, "disabled");
  setStringProperty(tool, raw, "display");
  setStringProperty(tool, raw, "providerId");
  setBooleanProperty(tool, raw, "supportsDeferredResults");
  setUnknownProperty(tool, raw, "unstable_backendDefault", "backendDefault");
  setUnknownProperty(tool, raw, "providerOptions", "providerOptions");
  setUnknownProperty(tool, raw, "args", "providerArgs");
  setUnknownProperty(tool, raw, "server", "server");

  const hasParameters = readSafely(() => Object.hasOwn(raw, "parameters"));
  if (!hasParameters.readable) {
    tool.parameters = UNSERIALIZABLE;
  } else if (hasParameters.value) {
    const parameters = readSafely(() => raw.parameters);
    if (!parameters.readable) {
      tool.parameters = UNSERIALIZABLE;
    } else {
      const schema = readSafely(() => toJsonSchema(parameters.value));
      tool.parameters = schema.readable ? schema.value : UNSERIALIZABLE;
    }
  }

  return tool;
};

export const normalizeToolList = (value: unknown): NormalizedTool[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    const tools: NormalizedTool[] = [];

    const length = readSafely(() => value.length);
    if (!length.readable || !Number.isSafeInteger(length.value)) return tools;

    for (let index = 0; index < length.value; index++) {
      const entry = readSafely(() => value[index]);
      if (!entry.readable) {
        tools.push({ name: UNSERIALIZABLE });
        continue;
      }
      if (!isRecord(entry.value)) continue;

      const name = readSafely(() => entry.value.name);
      if (!name.readable) {
        tools.push({ name: UNSERIALIZABLE });
        continue;
      }
      if (typeof name.value !== "string") continue;
      tools.push(mapToNormalizedTool(name.value, entry.value));
    }

    return tools;
  }

  if (isRecord(value)) {
    const tools: NormalizedTool[] = [];

    const names = readSafely(() => Object.keys(value));
    if (!names.readable) return tools;

    for (const name of names.value) {
      const entry = readSafely(() => value[name]);
      if (!entry.readable) {
        tools.push({ name });
        continue;
      }

      if (!isRecord(entry.value)) {
        tools.push({ name });
        continue;
      }

      tools.push(mapToNormalizedTool(name, entry.value));
    }

    return tools;
  }

  return [];
};
