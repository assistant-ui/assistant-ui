"use client";

import type { FC } from "react";
import type { ShikiHighlighterProps } from "react-shiki";
import { useAuiState } from "@assistant-ui/react";
import type { SyntaxHighlighterProps as AUIProps } from "@assistant-ui/react-markdown";
import { SyntaxHighlighter as SyntaxHighlighterBase } from "./shiki-highlighter";

/**
 * Props for the SyntaxHighlighter component
 */
export type HighlighterProps = Omit<
  ShikiHighlighterProps,
  "children" | "theme"
> & {
  theme?: ShikiHighlighterProps["theme"];
} & Pick<AUIProps, "language" | "code"> &
  Partial<Pick<AUIProps, "node" | "components">>;

/**
 * SyntaxHighlighter component, using react-shiki
 * Use it by passing to `defaultComponents` in `markdown-text.tsx`
 *
 * Skips tokenization while the message part is streaming and renders the
 * plain code in the same container, so streaming costs no Shiki work and
 * settling is a color change rather than a layout shift.
 *
 * @example
 * const defaultComponents = memoizeMarkdownComponents({
 *   SyntaxHighlighter,
 *   h1: //...
 *   //...other elements...
 * });
 */
export const SyntaxHighlighter: FC<HighlighterProps> = ({
  node: _node,
  components: _components,
  ...props
}) => {
  const isStreaming = useAuiState(
    (s) => s.optional.part?.status.type === "running",
  );

  return <SyntaxHighlighterBase {...props} streaming={isStreaming} />;
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
