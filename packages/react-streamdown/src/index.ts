export { StreamdownTextPrimitive } from "./primitives/StreamdownText";
export {
  useIsStreamdownCodeBlock,
  useStreamdownPreProps,
} from "./adapters/PreOverride";
export { DEFAULT_SHIKI_THEME } from "./defaults";
export { memoCompareNodes } from "./memoization";

export type {
  StreamdownTextPrimitiveProps,
  SyntaxHighlighterProps,
  CodeHeaderProps,
  ComponentsByLanguage,
  StreamdownTextComponents,
  PluginConfig,
  ResolvedPluginConfig,
  CaretStyle,
  ControlsConfig,
  LinkSafetyConfig,
  LinkSafetyModalProps,
  RemendConfig,
  RemendHandler,
  MermaidOptions,
  MermaidErrorComponentProps,
  AllowedTags,
  RemarkRehypeOptions,
  BlockProps,
  SecurityConfig,
} from "./types";

// Re-export streamdown context and utilities
export { StreamdownContext, parseMarkdownIntoBlocks } from "streamdown";

// Re-export streamdown types
export type {
  StreamdownProps,
  CodeHighlighterPlugin,
  DiagramPlugin,
  MathPlugin,
  CjkPlugin,
  HighlightOptions,
} from "streamdown";

// Re-export shiki types from streamdown
export type { BundledTheme, BundledLanguage } from "streamdown";
