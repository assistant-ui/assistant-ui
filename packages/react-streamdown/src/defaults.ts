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

const PLUGIN_KEYS = ["code", "math", "cjk", "mermaid"] as const;

export function mergePlugins(
  userPlugins: PluginConfig | undefined,
): ResolvedPluginConfig {
  const result: Record<string, unknown> = {};

  for (const key of PLUGIN_KEYS) {
    const value = userPlugins?.[key];
    if (value) result[key] = value;
  }

  return result as ResolvedPluginConfig;
}
