import { useEffect, useRef, useState } from "react";

export type UseShikiHighlighterOptions = {
  /** Shiki theme name (default: "github-dark"). */
  theme?: string;
  /**
   * Languages to preload (default: common web/systems languages).
   * Compared by value — safe to pass inline arrays.
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

function tokenColorToAnsi(color: string | undefined): string | undefined {
  if (!color?.startsWith("#")) return undefined;
  // Handle #RGB, #RRGGBB, #RRGGBBAA — extract only the first 6 hex chars
  const hex = color.length >= 7 ? color.slice(1, 7) : undefined;
  if (!hex) return undefined;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
  return `\x1b[38;2;${r};${g};${b}m`;
}

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
  const langsKey = JSON.stringify(langs);

  const [highlighter, setHighlighter] = useState<
    ((code: string, lang?: string) => string) | undefined
  >(undefined);

  const shikiRef = useRef<{ dispose: () => void } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: langsKey stabilizes langs array by value
  useEffect(() => {
    let cancelled = false;
    setHighlighter(undefined);

    import("shiki")
      .then(({ createHighlighter }) =>
        createHighlighter({
          themes: [theme as any],
          langs: langs as any[],
        }),
      )
      .then((shiki) => {
        if (cancelled) {
          shiki.dispose();
          return;
        }

        shikiRef.current = shiki;

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
                    const ansi = tokenColorToAnsi(token.color);
                    if (!ansi) return token.content;
                    return `${ansi}${token.content}\x1b[39m`;
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
      shikiRef.current?.dispose();
      shikiRef.current = null;
    };
  }, [theme, langsKey]);

  return highlighter;
}
