import type { ModelContext } from "@assistant-ui/react";
import type { SerializedModelContext } from "../types";
import { UNSERIALIZABLE, readSafely } from "./common";
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
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  if (typeof value === "function") {
    return "[Function]";
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    try {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime())
          ? String(value)
          : value.toISOString();
      }
      if (value instanceof Map) {
        const result: Record<string, unknown> = {};
        for (const [key, entry] of value.entries()) {
          let resultKey = UNSERIALIZABLE;
          try {
            resultKey = String(key);
          } catch {
            while (Object.hasOwn(result, resultKey)) {
              resultKey = `${UNSERIALIZABLE} ${Object.keys(result).length}`;
            }
          }

          try {
            result[resultKey] = sanitizeForMessage(entry, seen);
          } catch {
            result[resultKey] = UNSERIALIZABLE;
          }
        }
        return result;
      }
      if (value instanceof Set) {
        return Array.from(value).map((entry) =>
          sanitizeForMessage(entry, seen),
        );
      }
      if (Array.isArray(value)) {
        const result: unknown[] = [];
        const length = value.length;
        for (let index = 0; index < length; index++) {
          try {
            if (!(index in value)) continue;
            const item = sanitizeForMessage(value[index], seen);
            if (item !== undefined) result.push(item);
          } catch {
            result.push(UNSERIALIZABLE);
          }
        }
        return result;
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        try {
          result[key] = sanitizeForMessage(
            (value as Record<string, unknown>)[key],
            seen,
          );
        } catch {
          result[key] = UNSERIALIZABLE;
        }
      }
      return result;
    } catch {
      return UNSERIALIZABLE;
    } finally {
      seen.delete(value);
    }
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
 * Subtrees that are credential maps with arbitrary, user-defined key names
 * (MCP stdio `env`, HTTP `headers`). Per-key name matching cannot catch
 * `OPENAI_API_KEY` or a custom auth header, so every leaf inside one of these
 * is masked wholesale.
 */
const MASK_ALL_KEYS = new Set(["env", "headers"]);

/**
 * Mask values whose key names a known credential, and mask every value inside
 * an `env`/`headers` subtree wholesale. Operates on already sanitized plain
 * data (primitives, arrays, plain objects). Applied only to config-bearing
 * subtrees, never to a tool's parameters schema, so a schema property literally
 * named `token` is not corrupted.
 */
export const redactSensitive = (value: unknown, maskAll = false): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry, maskAll));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const normalized = normalizeKey(key);
      result[key] =
        maskAll || SENSITIVE_KEYS.has(normalized)
          ? REDACTED
          : redactSensitive(entry, MASK_ALL_KEYS.has(normalized));
    }
    return result;
  }
  return maskAll ? REDACTED : value;
};

export const sanitizeAndRedact = (value: unknown): unknown =>
  redactSensitive(sanitizeForMessage(value));

export const serializeModelContext = (
  context: ModelContext | undefined,
): SerializedModelContext | undefined => {
  if (!context || typeof context !== "object") {
    return undefined;
  }

  const modelContext = context as Record<string, unknown>;
  const result: SerializedModelContext = {};

  const systemValue = readSafely(() => modelContext.system);
  if (!systemValue.readable) {
    result.system = UNSERIALIZABLE;
  } else if (
    typeof systemValue.value === "string" &&
    systemValue.value.length > 0
  ) {
    result.system = systemValue.value;
  }

  const tools = readSafely(() => normalizeToolList(modelContext.tools));
  if (tools.readable && tools.value.length > 0) {
    result.tools = tools.value.map((tool): NormalizedTool => {
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

  const callSettings = readSafely(() => {
    const value = modelContext.callSettings;
    return value === undefined ? undefined : sanitizeAndRedact(value);
  });
  if (callSettings.readable && callSettings.value !== undefined) {
    if (
      typeof callSettings.value === "object" &&
      callSettings.value !== null &&
      !Array.isArray(callSettings.value)
    ) {
      result.callSettings = callSettings.value as Record<string, unknown>;
    }
  }

  const config = readSafely(() => {
    const value = modelContext.config;
    return value === undefined ? undefined : sanitizeAndRedact(value);
  });
  if (config.readable && config.value !== undefined) {
    if (
      typeof config.value === "object" &&
      config.value !== null &&
      !Array.isArray(config.value)
    ) {
      result.config = config.value as Record<string, unknown>;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};
