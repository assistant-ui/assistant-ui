"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";

const TINT_DEFAULT = 106;

export function TintKnob() {
  const [tint, setTint] = useState(TINT_DEFAULT);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--tint");
    };
  }, []);

  const apply = (next: number) => {
    setTint(next);
    if (next === TINT_DEFAULT) {
      document.documentElement.style.removeProperty("--tint");
    } else {
      document.documentElement.style.setProperty("--tint", String(next));
    }
  };

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="font-mono text-[12.5px] font-medium">--tint</span>
      <input
        type="range"
        min={0}
        max={360}
        value={tint}
        aria-label="Tint hue"
        onChange={(event) => apply(Number(event.target.value))}
        className="bg-border [&::-moz-range-thumb]:border-foreground/40 [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:border-foreground/40 [&::-webkit-slider-thumb]:bg-background rounded-capsule [&::-moz-range-thumb]:rounded-capsule [&::-webkit-slider-thumb]:rounded-capsule h-px w-56 cursor-ew-resize appearance-none outline-none [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:border [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border"
      />
      <span className="text-muted-foreground w-[3ch] text-right font-mono text-[11px] tabular-nums">
        {tint}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => apply(TINT_DEFAULT)}
        className={tint === TINT_DEFAULT ? "invisible" : undefined}
      >
        Back to {TINT_DEFAULT}
      </Button>
    </div>
  );
}

type MotionKind =
  | "hero-word"
  | "hero-rise"
  | "hero-glint"
  | "code-cascade"
  | "line-hot"
  | "stage-progress";

export function MotionSample({ kind }: { kind: MotionKind }) {
  const [epoch, setEpoch] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEpoch((n) => n + 1);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      onMouseEnter={() => setEpoch((n) => n + 1)}
      className="flex h-8 w-10 items-center overflow-hidden"
    >
      <Sample key={epoch} kind={kind} live={epoch > 0 && !reduced} />
    </span>
  );
}

function Sample({ kind, live }: { kind: MotionKind; live: boolean }) {
  switch (kind) {
    case "hero-word":
      return (
        <span className={live ? "hero-word" : undefined}>
          <span
            className={
              live
                ? "hero-word-ink font-mono text-[11px]"
                : "font-mono text-[11px]"
            }
          >
            ink
          </span>
        </span>
      );
    case "hero-rise":
      return (
        <span className="flex w-full flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={
                live
                  ? "hero-rise bg-foreground/40 block h-px"
                  : "bg-foreground/40 block h-px"
              }
              style={{
                width: `${28 - i * 6}px`,
                animationDelay: live ? `${i * 120}ms` : undefined,
              }}
            />
          ))}
        </span>
      );
    case "hero-glint":
      return (
        <span className="bg-foreground/[0.08] relative block size-6 overflow-hidden">
          {live ? (
            <span
              className="hero-glint absolute inset-0"
              style={{ animationDelay: "0.3s" }}
            />
          ) : null}
        </span>
      );
    case "code-cascade":
      return (
        <span
          className={
            live
              ? "code-cascade flex w-full flex-col gap-1.5"
              : "flex w-full flex-col gap-1.5"
          }
        >
          {[34, 24, 30].map((w, i) => (
            <span
              key={i}
              className="line bg-foreground/30 block h-px"
              style={{ width: `${w}px` }}
            />
          ))}
        </span>
      );
    case "line-hot":
      return (
        <span
          className={
            live
              ? "code-cascade flex w-full flex-col gap-1"
              : "flex w-full flex-col gap-1"
          }
        >
          <span className="line bg-foreground/20 block h-1 w-8" />
          <span
            className={
              live
                ? "line line-hot block h-1 w-8"
                : "line line-hot block h-1 w-8 bg-blue-500/8 shadow-[inset_2px_0_0_#3b82f6] dark:bg-blue-500/15"
            }
          />
          <span className="line bg-foreground/20 block h-1 w-7" />
        </span>
      );
    case "stage-progress":
      return (
        <span className="bg-foreground/15 relative block h-px w-full">
          <span
            className="absolute inset-0 origin-left bg-blue-500"
            style={
              live
                ? { animation: "stage-progress 2.4s linear both" }
                : { transform: "scaleX(1)" }
            }
          />
        </span>
      );
  }
}
