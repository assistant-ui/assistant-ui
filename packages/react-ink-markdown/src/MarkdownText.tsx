import { Text } from "ink";
import { useMemo } from "react";
import {
  render,
  type RenderOptions,
  type ThemeName,
  type Theme,
} from "markdansi";

export type MarkdownTextProps = {
  /** The markdown text to render. */
  text: string;

  /**
   * Message status. Currently unused — both "running" and "complete" use
   * markdansi's one-shot `render()`. Accepting it allows MarkdownTextPrimitive
   * to forward runtime status without filtering.
   */
  status?: "running" | "complete";

  /**
   * Syntax highlighting hook. Receives raw code and optional language,
   * must return ANSI-colored text. Must not add or remove newlines.
   */
  highlighter?: (code: string, lang?: string) => string;

  /** markdansi theme name or custom theme object. */
  theme?: ThemeName | Theme;
  /** Terminal width for wrapping (default: stdout.columns or 80). */
  width?: number;
  /** Enable word wrapping (default: true). */
  wrap?: boolean;
  /** Draw border around fenced code blocks (default: true). */
  codeBox?: boolean;
  /** Show line numbers in code blocks (default: false). */
  codeGutter?: boolean;
  /** Wrap long lines in code blocks (default: true). */
  codeWrap?: boolean;
  /** Enable OSC 8 hyperlinks (default: auto-detect). */
  hyperlinks?: boolean;
  /** Table border style. */
  tableBorder?: "unicode" | "ascii" | "none";
  /** Table cell padding. */
  tablePadding?: number;
  /** Dense table rendering. */
  tableDense?: boolean;
  /** Blockquote prefix (default: "\u2502 "). */
  quotePrefix?: string;
  /** List indentation (default: 2). */
  listIndent?: number;
};

const RENDER_OPTION_KEYS: (keyof RenderOptions)[] = [
  "highlighter",
  "theme",
  "width",
  "wrap",
  "codeBox",
  "codeGutter",
  "codeWrap",
  "hyperlinks",
  "tableBorder",
  "tablePadding",
  "tableDense",
  "quotePrefix",
  "listIndent",
];

function pickRenderOptions(
  props: MarkdownTextProps,
): RenderOptions | undefined {
  let opts: RenderOptions | undefined;
  for (const key of RENDER_OPTION_KEYS) {
    const value = props[key as keyof MarkdownTextProps];
    if (value !== undefined) {
      if (!opts) opts = {};
      (opts as any)[key] = value;
    }
  }
  return opts;
}

/**
 * Renders markdown text as formatted ANSI terminal output using markdansi.
 *
 * Re-renders the full text on each update via markdansi's one-shot `render()`.
 * This is fast enough for typical LLM output sizes (microseconds) and avoids
 * the complexity of incremental streaming state in React's rendering model.
 */
export const MarkdownText = (props: MarkdownTextProps) => {
  const { text } = props;
  const options = pickRenderOptions(props);
  // options is undefined when no render options are set, avoiding
  // unnecessary object allocation on each render
  // biome-ignore lint/correctness/useExhaustiveDependencies: JSON.stringify(options) stabilizes the new-object-per-render from pickRenderOptions
  const rendered = useMemo(
    () => render(text, options),
    [text, JSON.stringify(options)],
  );

  return <Text>{rendered}</Text>;
};

MarkdownText.displayName = "MarkdownText";
