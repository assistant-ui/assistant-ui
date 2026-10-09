"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { Widget, useThemeTokens } from "generative-frame/react";
import type { ThemeTokens } from "generative-frame";
import { LiveDot } from "@/components/shared/live-dot";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { RECORDED_TITLE, RECORDED_WIDGET, tokenize } from "./recorded";

const CHUNKS = tokenize(RECORDED_WIDGET);
const CHUNK_MS = 16;
const FONT_SANS = '"Public Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_CSS =
  "@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600&display=swap');";

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";
const control =
  "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors focus-visible:outline-2";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Replays a recorded show_widget call into a real widget frame. */
export function GenerativeFrameDemo() {
  const figureRef = useRef<HTMLElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [height, setHeight] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const pageTokens = useThemeTokens();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const tokens = useMemo<ThemeTokens>(
    () => ({
      ...pageTokens,
      variables: { ...pageTokens.variables, "--font-sans": FONT_SANS },
    }),
    [pageTokens],
  );

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const step = prefersReducedMotion() ? CHUNKS.length : 1;
    const timer = setInterval(() => {
      setCount((current) => {
        if (current >= CHUNKS.length) {
          clearInterval(timer);
          return current;
        }
        return Math.min(current + step, CHUNKS.length);
      });
    }, CHUNK_MS);
    return () => clearInterval(timer);
  }, [visible, run]);

  const code = useMemo(() => CHUNKS.slice(0, count).join(""), [count]);
  const streaming = count < CHUNKS.length;

  useEffect(() => {
    const pre = codeRef.current;
    if (pre) pre.scrollTop = pre.scrollHeight;
  }, [code]);

  const replay = () => {
    setPrompt(null);
    setHeight(null);
    setCount(0);
    setRun((current) => current + 1);
  };

  const dark = hydrated && resolvedTheme === "dark";

  return (
    <figure ref={figureRef} className="mx-auto max-w-5xl">
      <div className={cn(field, "grid overflow-hidden md:grid-cols-[2fr_3fr]")}>
        <div className="border-foreground/10 flex min-w-0 flex-col border-b md:border-r md:border-b-0">
          <p
            className={cn(
              mono,
              "text-muted-foreground flex items-center gap-2 px-4 pt-4 text-xs",
            )}
          >
            show_widget
            <span className="text-muted-foreground/70">
              title: {RECORDED_TITLE}
            </span>
          </p>
          <pre
            ref={codeRef}
            aria-label="Widget code as the model writes it"
            className={cn(
              mono,
              "text-foreground/80 h-44 overflow-auto px-4 pt-3 pb-4 text-[11.5px] leading-[1.6] break-all whitespace-pre-wrap md:h-[26rem]",
            )}
          >
            <code>{code}</code>
          </pre>
        </div>
        <div className="flex min-w-0 flex-col p-4 sm:p-6">
          {visible ? (
            <Widget
              key={run}
              code={code}
              streaming={streaming}
              tokens={tokens}
              product="assistant-ui-docs"
              css={FONT_CSS}
              maxHeight={640}
              onResize={(size) => setHeight(size.height)}
              onPrompt={(text) => setPrompt(text)}
            />
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <figcaption className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>
            fig. 01 · a recorded show_widget call, replayed into a live frame
          </span>
          <span
            role="status"
            className="text-foreground/80 inline-flex items-center gap-1.5 tabular-nums"
          >
            {streaming && visible ? <LiveDot /> : null}
            {prompt
              ? `sendPrompt: “${prompt}”`
              : streaming
                ? `${code.length.toLocaleString("en-US")} of ${RECORDED_WIDGET.length.toLocaleString("en-US")} characters`
                : height
                  ? `Scripts ran, frame height ${height}px`
                  : "Scripts ran"}
          </span>
        </figcaption>
        <div className="-mx-2.5 flex items-center gap-1">
          <button type="button" onClick={replay} className={control}>
            <RotateCcw aria-hidden className="size-3.5" />
            Replay
          </button>
          <button
            type="button"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className={control}
          >
            {dark ? (
              <Sun aria-hidden className="size-3.5" />
            ) : (
              <Moon aria-hidden className="size-3.5" />
            )}
            {dark ? "Light theme" : "Dark theme"}
          </button>
        </div>
      </div>
    </figure>
  );
}
