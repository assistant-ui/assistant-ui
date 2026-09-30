"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FC,
} from "react";
import {
  useShikiHighlighter,
  type ShikiHighlighterProps,
} from "react-shiki/core";
import {
  createHighlighterCore,
  guessEmbeddedLanguages,
  type HighlighterCore,
  type LanguageInput,
  type ThemeInput,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import { cn } from "@/lib/utils";

/**
 * Props for the SyntaxHighlighter component
 */
export type SyntaxHighlighterProps = Omit<
  ShikiHighlighterProps,
  "children" | "theme"
> & {
  theme?: ShikiHighlighterProps["theme"];
  code: string;
  highlightLines?: readonly number[] | undefined;
  /** Skips tokenization and renders the plain code while `true`. */
  streaming?: boolean;
};

const containerClassName =
  "aui-shiki-base [&_pre]:border-border/50 [&_pre]:bg-muted/30! [&_.line]:px-0! [&_pre]:overflow-x-auto [&_pre]:rounded-t-none [&_pre]:rounded-b-xl [&_pre]:border [&_pre]:border-t-0 [&_pre]:p-3.5 [&_pre]:text-[13px] [&_pre]:leading-relaxed";

const PlainCode: FC<{ code: string }> = ({ code }) => (
  <pre>
    <code>{code}</code>
  </pre>
);

const createHighlightedLinesTransformer = (
  highlightLines: readonly number[],
): NonNullable<ShikiHighlighterProps["transformers"]>[number] => {
  const highlightedLines = new Set(highlightLines);

  return {
    name: "assistant-ui:highlight-lines",
    line(node, line) {
      if (highlightedLines.has(line)) {
        this.addClassToHast(node, "highlighted");
      }
      return node;
    },
  };
};

type HighlighterOptions = Omit<
  ShikiHighlighterProps,
  "children" | "language" | "theme"
>;
type Engine = NonNullable<ShikiHighlighterProps["engine"]>;
type CodeProps = {
  code: string;
  language: SyntaxHighlighterProps["language"];
  theme: NonNullable<SyntaxHighlighterProps["theme"]>;
  options: HighlighterOptions;
};

const namedEngines = {
  javascript: () => createJavaScriptRegexEngine(),
  oniguruma: () =>
    import("shiki/engine/oniguruma").then(({ createOnigurumaEngine }) =>
      createOnigurumaEngine(import("shiki/wasm")),
    ),
};
const namedEngineKeys = { javascript: {}, oniguruma: {} };

const highlighters = new WeakMap<object, Promise<HighlighterCore>>();
const attemptedLoads = new WeakMap<HighlighterCore, Set<unknown>>();

const getHighlighter = (engine: Engine) => {
  const key = typeof engine === "string" ? namedEngineKeys[engine] : engine;
  const cached = highlighters.get(key);
  if (cached) return cached;
  const highlighter = createHighlighterCore({
    engine: typeof engine === "string" ? namedEngines[engine]() : engine,
  });
  highlighters.set(key, highlighter);
  highlighter.catch(() => highlighters.delete(key));
  return highlighter;
};

const findBundled = <T,>(bundle: Record<string, T>, id: string) =>
  Object.hasOwn(bundle, id) ? bundle[id] : undefined;

type PendingLoad = {
  key: string;
  inputs: unknown[];
  langs: LanguageInput[];
  themes: ThemeInput[];
};

const findPendingLoad = (
  highlighter: HighlighterCore,
  { code, language, theme, options }: CodeProps,
): PendingLoad => {
  const attempted = attemptedLoads.get(highlighter);
  const loadedLangs = highlighter.getLoadedLanguages();
  const loadedThemes = highlighter.getLoadedThemes();
  const pending: PendingLoad = { key: "", inputs: [], langs: [], themes: [] };
  const isPending = (input: unknown, id: string, loaded: string[]) =>
    !loaded.includes(id) && !attempted?.has(input);
  const track = (input: unknown, id: string) => {
    pending.inputs.push(input);
    pending.key += `${id}|`;
  };

  const addBundledLanguage = (lang: string) => {
    const id = lang.trim();
    const target =
      Object.entries(options.langAlias ?? {}).find(
        ([alias]) => alias.toLowerCase() === id.toLowerCase(),
      )?.[1] ?? id;
    const bundled = findBundled(bundledLanguages, target);
    if (!bundled || !isPending(target, target, loadedLangs)) return;
    pending.langs.push(bundled);
    track(target, target);
  };

  for (const lang of [
    language,
    ...[options.preloadLanguages ?? []].flat(),
    ...[options.customLanguages ?? []].flat(),
  ]) {
    if (!lang) continue;
    if (typeof lang === "string") {
      addBundledLanguage(lang);
    } else if ("scopeName" in lang) {
      if (!isPending(lang, lang.name, loadedLangs)) continue;
      pending.langs.push(lang);
      track(lang, lang.name);
    } else if (!attempted?.has(lang)) {
      pending.langs.push(lang);
      track(lang, "*");
    }
  }
  if (typeof language === "string") {
    for (const embedded of guessEmbeddedLanguages(code, language)) {
      addBundledLanguage(embedded);
    }
  }

  const themes =
    typeof theme === "string" || "tokenColors" in theme || "settings" in theme
      ? [theme]
      : Object.values(theme);
  for (const name of themes) {
    if (typeof name !== "string") continue;
    const bundled = findBundled(bundledThemes, name);
    if (!bundled || !isPending(name, name, loadedThemes)) continue;
    pending.themes.push(bundled);
    track(name, name);
  }
  return pending;
};

/**
 * Keeps one Shiki highlighter per RegExp engine, unlike react-shiki's page-wide
 * singleton, so an explicit `engine` is honored. The JavaScript engine is the
 * default because the Oniguruma engine compiles WebAssembly, which a Content
 * Security Policy without 'wasm-unsafe-eval' blocks.
 */
const useEngineHighlighter = (engine: Engine, props: CodeProps) => {
  const [resolved, setResolved] = useState<{
    engine: Engine;
    highlighter: HighlighterCore;
  }>();
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    let active = true;
    getHighlighter(engine).then(
      (highlighter) => {
        if (active) setResolved({ engine, highlighter });
      },
      (error: unknown) => {
        console.error("[shiki-highlighter] highlighter failed", error);
      },
    );
    return () => {
      active = false;
    };
  }, [engine]);

  const highlighter =
    resolved?.engine === engine ? resolved.highlighter : undefined;
  const pending = highlighter ? findPendingLoad(highlighter, props) : undefined;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    const load = pendingRef.current;
    if (!highlighter || !load?.key) return;
    const attempted = attemptedLoads.get(highlighter) ?? new Set();
    attemptedLoads.set(highlighter, attempted);
    Promise.all([
      highlighter.loadLanguage(...load.langs),
      highlighter.loadTheme(...load.themes),
    ])
      .catch((error: unknown) => {
        console.error("[shiki-highlighter] loading failed", error);
      })
      .finally(() => {
        for (const input of load.inputs) attempted.add(input);
        rerender();
      });
  }, [highlighter, pending?.key]);

  return pending?.key === "" ? highlighter : undefined;
};

const ShikiCode: FC<CodeProps> = ({ code, language, theme, options }) => {
  const highlighted = useShikiHighlighter(code, language, theme, {
    ...options,
    defaultColor: "light-dark()",
  });
  return <>{highlighted ?? <PlainCode code={code} />}</>;
};

const EngineCode: FC<CodeProps & { engine: Engine }> = ({
  engine,
  ...props
}) => {
  const highlighter = useEngineHighlighter(engine, props);
  if (!highlighter) return <PlainCode code={props.code} />;
  return <ShikiCode {...props} options={{ ...props.options, highlighter }} />;
};

const HighlightedCode: FC<CodeProps> = (props) => {
  const { engine = "javascript", highlighter, ...options } = props.options;
  if (highlighter) return <ShikiCode {...props} />;
  return <EngineCode {...props} options={options} engine={engine} />;
};

/**
 * SyntaxHighlighter component, using react-shiki
 *
 * Skips tokenization while `streaming` and renders the plain code in the
 * same container, so streaming costs no Shiki work and settling is a color
 * change rather than a layout shift.
 */
export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
  code,
  language,
  theme = { dark: "github-dark-default", light: "github-light-default" },
  className,
  style,
  // Inert: useShikiHighlighter output has no default styles or language label.
  addDefaultStyles: _addDefaultStyles,
  showLanguage: _showLanguage,
  delay = 150, // the part settles before smooth streaming finishes draining, so code keeps changing for a few frames
  streaming = false,
  highlightLines,
  ...options
}) => {
  const trimmed = code.trim();
  const highlightKey = highlightLines?.join(",") ?? "";
  const callerTransformers = options.transformers;
  const transformers = useMemo(
    () =>
      highlightKey
        ? [
            ...(callerTransformers ?? []),
            createHighlightedLinesTransformer(
              highlightKey.split(",").map(Number),
            ),
          ]
        : callerTransformers,
    [highlightKey, callerTransformers],
  );

  return (
    <div
      className={cn(
        containerClassName,
        streaming && "aui-shiki-streaming",
        className,
      )}
      style={style}
    >
      {streaming ? (
        <PlainCode code={trimmed} />
      ) : (
        <HighlightedCode
          code={trimmed}
          language={language}
          theme={theme}
          options={
            transformers
              ? { ...options, delay, transformers }
              : { ...options, delay }
          }
        />
      )}
    </div>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
