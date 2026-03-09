import { Text } from "ink";
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

/**
 * Renders markdown text as formatted ANSI terminal output using markdansi.
 *
 * Re-renders the full text on each update via markdansi's one-shot `render()`.
 * This is fast enough for typical LLM output sizes (microseconds) and avoids
 * the complexity of incremental streaming state in React's rendering model.
 */
export const MarkdownText = ({ text, ...options }: MarkdownTextProps) => {
  const rendered = render(
    text,
    Object.values(options).some((v) => v !== undefined)
      ? (options as RenderOptions)
      : undefined,
  );
  return <Text>{rendered}</Text>;
};

MarkdownText.displayName = "MarkdownText";
