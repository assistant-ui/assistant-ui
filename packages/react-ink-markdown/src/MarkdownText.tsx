import { Text, useStdout } from "ink";
import {
  render,
  type RenderOptions,
  type ThemeName,
  type Theme,
} from "markdansi";
import { memo, useCallback, useSyncExternalStore } from "react";
import { filterHyperlinks, hasRefusedHyperlink } from "./filterHyperlinks";
import { sanitizeTerminalText } from "./sanitizeTerminalText";

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
  /**
   * Enable OSC 8 hyperlinks (default: auto-detect). Only http and https
   * links become hyperlinks. If a message has a link with any other scheme,
   * the whole message renders as with hyperlinks off: every link shows as
   * "label (url)".
   */
  hyperlinks?: boolean;
  /** Enable ANSI colors (default: auto-detect). */
  color?: boolean;
  /** Table border style. */
  tableBorder?: "unicode" | "ascii" | "none";
  /** Table cell padding. */
  tablePadding?: number;
  /** Dense table rendering. */
  tableDense?: boolean;
  /** Truncate table cells to fit column width (default: true). */
  tableTruncate?: boolean;
  /** Ellipsis text for table cell truncation (default: "…"). */
  tableEllipsis?: string;
  /** Blockquote prefix (default: "\u2502 "). */
  quotePrefix?: string;
  /** List indentation (default: 2). */
  listIndent?: number;
};

// One shared "resize" listener per stream; per-instance listeners trip Node's
// ten-listener warning once a thread renders more than ten markdown messages.
type ResizeStore = {
  subscribers: Set<() => void>;
  notify: () => void;
};
type Stdout = ReturnType<typeof useStdout>["stdout"];

const resizeStores = new WeakMap<Stdout, ResizeStore>();

const subscribeToStreamResize = (stdout: Stdout, onChange: () => void) => {
  let store = resizeStores.get(stdout);
  if (!store) {
    const subscribers = new Set<() => void>();
    const created: ResizeStore = {
      subscribers,
      notify: () => {
        for (const subscriber of subscribers) subscriber();
      },
    };
    resizeStores.set(stdout, created);
    stdout.on("resize", created.notify);
    store = created;
  }
  store.subscribers.add(onChange);
  return () => {
    store.subscribers.delete(onChange);
    if (store.subscribers.size === 0) {
      stdout.off("resize", store.notify);
      resizeStores.delete(stdout);
    }
  };
};

const getTerminalWidth = (stdout: Stdout) => {
  const columns = "columns" in stdout ? stdout.columns : undefined;
  return typeof columns === "number" ? columns : undefined;
};

const MarkdownTextImpl = ({ text, ...options }: MarkdownTextProps) => {
  const { stdout } = useStdout();
  const subscribeToResize = useCallback(
    (onChange: () => void) => subscribeToStreamResize(stdout, onChange),
    [stdout],
  );
  const usesTerminalWidth =
    options.width === undefined && options.wrap !== false;
  const terminalWidth = useSyncExternalStore(subscribeToResize, () => {
    if (!usesTerminalWidth) return undefined;
    return getTerminalWidth(stdout);
  });

  const resolvedOptions =
    usesTerminalWidth && terminalWidth !== undefined
      ? { ...options, width: terminalWidth }
      : options;

  const source = sanitizeTerminalText(text);
  // markdansi has no per-link hook. If any link has a scheme we don't
  // hyperlink, render again without hyperlinks so markdansi lays out every
  // link as "label (url)" itself, tables and wrapping included. Code blocks
  // render the same both times, so the second pass reuses the highlighting.
  const { highlighter } = resolvedOptions;
  const highlighted = new Map<string, string>();
  const renderOptions = {
    ...resolvedOptions,
    ...(highlighter && {
      highlighter: (code: string, lang?: string) => {
        const key = `${lang ?? ""}\u0000${code}`;
        let result = highlighted.get(key);
        if (result === undefined) {
          result = highlighter(code, lang);
          highlighted.set(key, result);
        }
        return result;
      },
    }),
  };
  let rendered = render(
    source,
    Object.values(renderOptions).some((v) => v !== undefined)
      ? (renderOptions as RenderOptions)
      : undefined,
  );
  if (hasRefusedHyperlink(rendered)) {
    rendered = render(source, {
      ...renderOptions,
      hyperlinks: false,
    } as RenderOptions);
  }
  return <Text>{filterHyperlinks(rendered)}</Text>;
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
