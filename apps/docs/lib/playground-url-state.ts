"use client";

import {
  createParser,
  parseAsBoolean,
  parseAsStringLiteral,
  useQueryStates,
  type inferParserType,
} from "nuqs";
import { useCallback, useMemo } from "react";
import { type BuilderConfig, DEFAULT_CONFIG } from "@/components/builder/types";
import {
  PRESETS,
  getPresetById,
  configMatchesPreset,
} from "@/components/builder/presets";

// Preset IDs from presets.ts
const PRESET_IDS = PRESETS.map((p) => p.id);

// ============ Diff/Merge Utilities ============

/**
 * Compute the difference between config and defaults
 * Only stores values that differ from DEFAULT_CONFIG
 */
export function computeDiff(
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

/**
 * Apply diff to defaults to reconstruct full config
 */
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

// ============ Base64 URL-safe Encoding ============

export function base64UrlEncode(str: string): string {
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

export function base64UrlDecode(str: string): string {
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

// ============ Config Encode/Decode Helpers ============

/**
 * Encode a BuilderConfig to a URL-safe string
 */
export function encodeConfig(config: BuilderConfig): string {
  const diff = computeDiff(config, DEFAULT_CONFIG);
  const json = JSON.stringify(diff);
  return base64UrlEncode(json);
}

/**
 * Decode a URL-safe string back to a BuilderConfig
 */
export function decodeConfig(encoded: string): BuilderConfig {
  const json = base64UrlDecode(encoded);
  const diff = JSON.parse(json) as Record<string, unknown>;
  return applyDiff(diff, DEFAULT_CONFIG);
}

// ============ Custom Parsers ============

/**
 * Parser for BuilderConfig using incremental encoding + Base64
 */
export const parseAsConfig = createParser<BuilderConfig>({
  parse(query: string): BuilderConfig | null {
    try {
      const json = base64UrlDecode(query);
      const diff = JSON.parse(json) as Record<string, unknown>;
      return applyDiff(diff, DEFAULT_CONFIG);
    } catch {
      return null;
    }
  },
  serialize(config: BuilderConfig): string {
    const diff = computeDiff(config, DEFAULT_CONFIG);
    const json = JSON.stringify(diff);
    return base64UrlEncode(json);
  },
  eq(a: BuilderConfig, b: BuilderConfig): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  },
});

/**
 * Parser for viewport width (number or "100%")
 */
export const parseAsViewportWidth = createParser<number | "100%">({
  parse(query: string): number | "100%" | null {
    if (query === "full") return "100%";
    const num = parseInt(query, 10);
    return Number.isNaN(num) ? null : num;
  },
  serialize(value: number | "100%"): string {
    return value === "100%" ? "full" : String(value);
  },
  eq(a, b) {
    return a === b;
  },
});

/**
 * Parser for preset ID
 */
export const parseAsPreset = createParser<string>({
  parse(query: string): string | null {
    return PRESET_IDS.includes(query) ? query : null;
  },
  serialize(value: string): string {
    return value;
  },
  eq(a, b) {
    return a === b;
  },
});

// ============ Search Params Schema ============

export const playgroundSearchParams = {
  preset: parseAsPreset, // Preset shortcut (e.g., ?preset=chatgpt)
  c: parseAsConfig.withDefault(DEFAULT_CONFIG), // Config (incremental encoded)
  code: parseAsBoolean.withDefault(false), // Show code panel
  vp: parseAsStringLiteral([
    "desktop",
    "tablet",
    "mobile",
  ] as const).withDefault("desktop"), // Viewport preset
  vw: parseAsViewportWidth.withDefault("100%"), // Viewport width
};

export type PlaygroundSearchParams = inferParserType<
  typeof playgroundSearchParams
>;

// ============ Custom Hook ============

export type ViewportPreset = "desktop" | "tablet" | "mobile";

export interface UsePlaygroundStateOptions {
  throttleMs?: number;
}

export interface PlaygroundState {
  config: BuilderConfig;
  showCode: boolean;
  viewportPreset: ViewportPreset | null;
  viewportWidth: number | "100%";
  setConfig: (config: BuilderConfig) => void;
  setShowCode: (showCode: boolean) => void;
  setViewportPreset: (preset: ViewportPreset) => void;
  setViewportWidth: (width: number) => void;
}

const VIEWPORT_WIDTHS: Record<ViewportPreset, number | "100%"> = {
  desktop: "100%",
  tablet: 768,
  mobile: 375,
};

export function usePlaygroundState(
  options: UsePlaygroundStateOptions = {},
): PlaygroundState {
  const { throttleMs = 300 } = options;

  const [state, setState] = useQueryStates(playgroundSearchParams, {
    history: "replace",
    shallow: true,
    throttleMs,
  });

  // Compute effective config: preset takes priority over c
  const config = useMemo(() => {
    if (state.preset) {
      const preset = getPresetById(state.preset);
      return preset?.config ?? DEFAULT_CONFIG;
    }
    return state.c;
  }, [state.preset, state.c]);

  // Compute effective viewport preset
  const viewportPreset = useMemo((): ViewportPreset | null => {
    const vp = state.vp;
    if (vp === "desktop" || vp === "tablet" || vp === "mobile") {
      // Verify width matches preset
      if (state.vw === VIEWPORT_WIDTHS[vp]) {
        return vp;
      }
    }
    return null;
  }, [state.vp, state.vw]);

  // Set config - auto-detect if it matches a preset
  const setConfig = useCallback(
    (newConfig: BuilderConfig) => {
      const matchingPreset = configMatchesPreset(newConfig);
      if (matchingPreset) {
        // Use preset shortcut if config matches exactly
        setState({
          preset: matchingPreset.id,
          c: null,
        });
      } else {
        // Store as incremental diff
        setState({
          preset: null,
          c: newConfig,
        });
      }
    },
    [setState],
  );

  // Set show code
  const setShowCode = useCallback(
    (showCode: boolean) => {
      setState({ code: showCode });
    },
    [setState],
  );

  // Set viewport preset
  const setViewportPreset = useCallback(
    (preset: ViewportPreset) => {
      setState({
        vp: preset,
        vw: VIEWPORT_WIDTHS[preset],
      });
    },
    [setState],
  );

  // Set custom viewport width (clears preset)
  const setViewportWidth = useCallback(
    (width: number) => {
      setState({
        vp: null,
        vw: width,
      });
    },
    [setState],
  );

  return {
    config,
    showCode: state.code,
    viewportPreset,
    viewportWidth: state.vw,
    setConfig,
    setShowCode,
    setViewportPreset,
    setViewportWidth,
  };
}
