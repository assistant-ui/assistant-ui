import type { ModelContext } from "@assistant-ui/react";
import type { SerializedModelContext } from "../types";
import { normalizeToolList, type NormalizedTool } from "./toolNormalization";

export const sanitizeForMessage = (
  value: unknown,
  seen = new WeakSet<object>(),
): unknown => {
  // Early return for primitives
  if (value === null || value === undefined) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "function") {
    return "[Function]";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Map) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of value.entries()) {
      result[String(key)] = sanitizeForMessage(entry, seen);
    }
    return result;
  }
  if (value instanceof Set) {
    return Array.from(value).map((entry) => sanitizeForMessage(entry, seen));
  }
  if (Array.isArray(value)) {
    if (seen.has(value as unknown as object)) return "[Circular]";
    seen.add(value as unknown as object);
    return value
      .map((entry) => sanitizeForMessage(entry, seen))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = sanitizeForMessage(entry, seen);
    }
    return result;
  }
  return value;
};

export const REDACTED = "[redacted]";

const SENSITIVE_KEYS = new Set([
  "apikey",
  "xapikey",
  "accesskey",
  "authorization",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "token",
  "accesstoken",
  "refreshtoken",
  "cookie",
  "setcookie",
  "credential",
  "credentials",
  "privatekey",
  "bearer",
  "sessionid",
]);

const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_]/g, "");

/**
 * Mask values whose key names a known credential. Operates on already
 * sanitized plain data (primitives, arrays, plain objects). Applied only to
 * config-bearing subtrees, never to a tool's parameters schema, so a schema
 * property literally named `token` is not corrupted.
 */
export const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = SENSITIVE_KEYS.has(normalizeKey(key))
        ? REDACTED
        : redactSensitive(entry);
    }
    return result;
  }
  return value;
};

const sanitizeAndRedact = (value: unknown): unknown =>
  redactSensitive(sanitizeForMessage(value));

export const serializeModelContext = (
  context: ModelContext | undefined,
): SerializedModelContext | undefined => {
  if (!context || typeof context !== "object") {
    return undefined;
  }

  const modelContext = context as Record<string, unknown>;
  const result: SerializedModelContext = {};

  const systemValue = modelContext.system;
  if (typeof systemValue === "string" && systemValue.length > 0) {
    result.system = systemValue;
  }

  const tools = normalizeToolList(modelContext.tools);
  if (tools.length > 0) {
    result.tools = tools.map((tool): NormalizedTool => {
      return {
        ...tool,
        parameters: sanitizeForMessage(tool.parameters),
        ...(tool.providerOptions !== undefined
          ? { providerOptions: sanitizeAndRedact(tool.providerOptions) }
          : {}),
        ...(tool.providerArgs !== undefined
          ? { providerArgs: sanitizeAndRedact(tool.providerArgs) }
          : {}),
        ...(tool.server !== undefined
          ? { server: sanitizeAndRedact(tool.server) }
          : {}),
        ...(tool.backendDefault !== undefined
          ? { backendDefault: sanitizeForMessage(tool.backendDefault) }
          : {}),
      };
    });
  }

  if (modelContext.callSettings !== undefined) {
    const callSettings = sanitizeAndRedact(modelContext.callSettings);
    if (
      callSettings &&
      typeof callSettings === "object" &&
      !Array.isArray(callSettings)
    ) {
      result.callSettings = callSettings as Record<string, unknown>;
    }
  }

  if (modelContext.config !== undefined) {
    const config = sanitizeAndRedact(modelContext.config);
    if (config && typeof config === "object" && !Array.isArray(config)) {
      result.config = config as Record<string, unknown>;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};
