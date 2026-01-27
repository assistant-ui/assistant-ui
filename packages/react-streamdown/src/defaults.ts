"use client";

import type { BundledTheme } from "streamdown";
import type { PluginConfig, ResolvedPluginConfig } from "./types";

/**
 * Default Shiki theme for code highlighting.
 * First value is light theme, second is dark theme.
 */
export const DEFAULT_SHIKI_THEME: [BundledTheme, BundledTheme] = [
  "github-light",
  "github-dark",
];

const PLUGIN_KEYS = ["code", "math", "cjk"] as const;

/**
 * Merges user plugin configuration with detected defaults.
 *
 * Rules:
 * - `false` = explicitly disable a plugin
 * - `undefined` = use default (auto-detect)
 * - plugin instance = use provided plugin
 * - mermaid requires explicit enabling (not auto-detected)
 */
export function mergePlugins(
  userPlugins: PluginConfig | undefined,
  defaultPlugins: ResolvedPluginConfig,
): ResolvedPluginConfig {
  const result: Record<string, unknown> = {};

  // Handle code, math, cjk plugins (support auto-detection)
  for (const key of PLUGIN_KEYS) {
    const userValue = userPlugins?.[key];
    if (userValue === false) continue;
    if (userValue) {
      result[key] = userValue;
    } else if (defaultPlugins[key]) {
      result[key] = defaultPlugins[key];
    }
  }

  // Handle mermaid plugin - must be explicitly provided (not auto-detected)
  if (userPlugins?.mermaid && userPlugins.mermaid !== false) {
    result["mermaid"] = userPlugins.mermaid;
  }

  return result as ResolvedPluginConfig;
}
