import { useEffect, useState } from "react";

type UseShikiHighlighterOptions = {
  /** Shiki theme name (default: "github-dark"). */
  theme?: string;
  /**
   * Languages to preload (default: common web/systems languages).
   * Pass a stable array reference to avoid re-initializing the highlighter
   * on every render — e.g. define it outside the component or use useMemo.
   */
  langs?: string[];
};

const DEFAULT_LANGS = [
  "typescript",
  "javascript",
  "python",
  "bash",
  "json",
  "html",
  "css",
  "rust",
  "go",
  "java",
];

/**
 * Hook that asynchronously initializes a Shiki highlighter and returns a
 * function compatible with markdansi's `highlighter` option.
 *
 * Requires `shiki` as an optional peer dependency. Returns `undefined`
 * while loading.
 *
 * @example
 * ```tsx
 * const highlighter = useShikiHighlighter({ theme: "github-dark" });
 * <MarkdownText text={text} highlighter={highlighter} />
 * ```
 */
export function useShikiHighlighter(
  options?: UseShikiHighlighterOptions,
): ((code: string, lang?: string) => string) | undefined {
  const theme = options?.theme ?? "github-dark";
  const langs = options?.langs ?? DEFAULT_LANGS;

  const [highlighter, setHighlighter] = useState<
    ((code: string, lang?: string) => string) | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;

    import("shiki")
      .then(({ createHighlighter }) =>
        createHighlighter({
          themes: [theme as any],
          langs: langs as any[],
        }),
      )
      .then((shiki) => {
        if (cancelled) return;

        const fn = (code: string, lang?: string): string => {
          if (!lang) return code;
          try {
            const tokens = shiki.codeToTokensBase(code, {
              lang: lang as any,
              theme: theme as any,
            });
            return tokens
              .map((line) =>
                line
                  .map((token) => {
                    const color = token.color;
                    if (!color) return token.content;
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    return `\x1b[38;2;${r};${g};${b}m${token.content}\x1b[39m`;
                  })
                  .join(""),
              )
              .join("\n");
          } catch {
            return code;
          }
        };

        // Wrap in arrow to prevent React from calling fn as a state updater
        setHighlighter(() => fn);
      })
      .catch(() => {
        // shiki not installed or failed to load — leave as undefined
      });

    return () => {
      cancelled = true;
    };
  }, [theme, langs]);

  return highlighter;
}
