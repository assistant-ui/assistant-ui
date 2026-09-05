export {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
} from "./primitives/MarkdownText";

export type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "./overrides/types";

export { useIsMarkdownCodeBlock } from "./overrides/PreOverride";
/** @deprecated Experimental since 2025-02-02, extended 2027-03-05. Not scheduled for removal; the API may change in any release. */
export { memoizeMarkdownComponents as unstable_memoizeMarkdownComponents } from "./memoization";

export {
  rewriteLatexBracketDelimiters,
  rewriteCustomMathTags,
  normalizeMathDelimiters,
  escapeCurrencyDollars,
} from "./preprocess";
