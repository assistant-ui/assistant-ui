import {
  type BuilderConfig,
  DEFAULT_CONFIG,
} from "@/components/pages/playground/types";

function computeDiff(
  config: BuilderConfig,
  defaults: BuilderConfig,
): Record<string, unknown> {
  function deepDiff(current: unknown, defaultVal: unknown): unknown {
    if (current === defaultVal) return undefined;
    if (
      typeof current !== "object" ||
      current === null ||
      typeof defaultVal !== "object" ||
      defaultVal === null
    ) {
      return current;
    }

    const result: Record<string, unknown> = {};
    let hasChanges = false;

    for (const key of Object.keys(current as Record<string, unknown>)) {
      const currentObj = current as Record<string, unknown>;
      const defaultObj = defaultVal as Record<string, unknown>;
      const childDiff = deepDiff(currentObj[key], defaultObj[key]);
      if (childDiff !== undefined) {
        result[key] = childDiff;
        hasChanges = true;
      }
    }

    return hasChanges ? result : undefined;
  }

  return (deepDiff(config, defaults) as Record<string, unknown>) || {};
}

export function applyDiff(
  diff: Record<string, unknown>,
  defaults: BuilderConfig,
): BuilderConfig {
  function deepMerge(target: unknown, source: unknown): unknown {
    if (source === undefined || source === null) return target;
    if (typeof source !== "object" || typeof target !== "object") return source;
    if (target === null) return source;

    const result = { ...(target as Record<string, unknown>) };
    for (const key of Object.keys(source as Record<string, unknown>)) {
      const sourceObj = source as Record<string, unknown>;
      result[key] = deepMerge(result[key], sourceObj[key]);
    }
    return result;
  }

  return deepMerge(defaults, diff) as BuilderConfig;
}

function base64UrlEncode(str: string): string {
  if (typeof window !== "undefined") {
    const bytes = new TextEncoder().encode(str);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
      "",
    );
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return Buffer.from(str, "utf-8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  const pad = str.length % 4;
  const padded = pad ? str + "=".repeat(4 - pad) : str;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");

  if (typeof window !== "undefined") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function encodeConfig(config: BuilderConfig): string {
  const diff = computeDiff(config, DEFAULT_CONFIG);
  const json = JSON.stringify(diff);
  return base64UrlEncode(json);
}

export function decodeConfig(encoded: string): BuilderConfig {
  const json = base64UrlDecode(encoded);
  const diff = JSON.parse(json) as Record<string, unknown>;
  return applyDiff(diff, DEFAULT_CONFIG);
}
