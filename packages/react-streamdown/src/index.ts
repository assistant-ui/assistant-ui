export { StreamdownTextPrimitive } from "./primitives/StreamdownText";
export { useIsStreamdownCodeBlock } from "./adapters/PreOverride";
export { DEFAULT_SHIKI_THEME } from "./defaults";

export type {
  StreamdownTextPrimitiveProps,
  SyntaxHighlighterProps,
  CodeHeaderProps,
  ComponentsByLanguage,
  StreamdownTextComponents,
  PluginConfig,
  ResolvedPluginConfig,
} from "./types";

// Re-export useful streamdown types
export type { StreamdownProps } from "streamdown";
