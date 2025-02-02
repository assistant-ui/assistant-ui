export {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
} from "./primitives/MarkdownText";

export type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "./overrides/types";

export { useIsMarkdownCodeBlock } from "./overrides/PreOverride";

export {
  /** @deprecated This export was moved to `@assistant-ui/react-ui`. Use the migration codemod to update your code, by running `npx assistant-ui upgrade`. */
  makeMarkdownText,

  /** @deprecated This export was moved to `@assistant-ui/react-ui`. Use the migration codemod to update your code, by running `npx assistant-ui upgrade`. */
  type MakeMarkdownTextProps,
} from "./ui/markdown-text";

/** @deprecated This export was moved to `@assistant-ui/react-ui`. Use the migration codemod to update your code, by running `npx assistant-ui upgrade`. */
export { CodeHeader } from "./ui/code-header";

export { memoizeMarkdownComponents as unstable_memoizeMarkdownComponents } from "./memoization";
