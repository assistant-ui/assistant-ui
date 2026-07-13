import { Text, useStdout } from "ink";
import {
  render,
  type RenderOptions,
  type ThemeName,
  type Theme,
} from "markdansi";
import { memo, useCallback, useSyncExternalStore } from "react";

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

const MarkdownTextImpl = ({ text, ...options }: MarkdownTextProps) => {
  const { stdout } = useStdout();
  const subscribeToResize = useCallback(
    (onChange: () => void) => {
      stdout.on("resize", onChange);
      return () => {
        stdout.off("resize", onChange);
      };
    },
    [stdout],
  );
  const terminalWidth = useSyncExternalStore(
    subscribeToResize,
    () => stdout.columns,
  );

  // Inject the live width only where markdansi would read the terminal itself
  // (wrapping enabled, no explicit width), so resizes reach memoized output.
  const resolvedOptions =
    options.width === undefined &&
    options.wrap !== false &&
    terminalWidth !== undefined
      ? { ...options, width: terminalWidth }
      : options;

  const rendered = render(
    text,
    Object.values(resolvedOptions).some((v) => v !== undefined)
      ? (resolvedOptions as RenderOptions)
      : undefined,
  );
  return <Text>{rendered}</Text>;
};

MarkdownTextImpl.displayName = "MarkdownText";

/**
 * Renders markdown text as formatted ANSI terminal output using markdansi.
 *
 * Renders the full text via markdansi's one-shot `render()`; memoized so
 * re-renders with unchanged props skip the re-parse. A stdout resize
 * subscription feeds the live terminal width into the render, so memoized
 * output still re-wraps when the terminal is resized. This is fast enough for
 * typical LLM output sizes (microseconds) and avoids the complexity of
 * incremental streaming state in React's rendering model.
 */
export const MarkdownText = memo(MarkdownTextImpl);
