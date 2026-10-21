"use client";

import {
  createParser,
  parseAsBoolean,
  parseAsStringLiteral,
  useQueryStates,
  type inferParserType,
} from "nuqs";
import { useCallback, useMemo } from "react";
import {
  type BuilderConfig,
  DEFAULT_CONFIG,
} from "@/components/pages/playground/types";
import {
  PRESETS,
  getPresetById,
  configMatchesPreset,
} from "@/components/pages/playground/presets";
import { decodeConfig, encodeConfig } from "./playground-config-codec";

// Preset IDs from presets.ts
const PRESET_IDS = PRESETS.map((p) => p.id);

/**
 * Parser for BuilderConfig using incremental encoding + Base64
 */
export const parseAsConfig = createParser<BuilderConfig>({
  parse(query: string): BuilderConfig | null {
    try {
      return decodeConfig(query);
    } catch {
      return null;
    }
  },
  serialize(config: BuilderConfig): string {
    return encodeConfig(config);
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
