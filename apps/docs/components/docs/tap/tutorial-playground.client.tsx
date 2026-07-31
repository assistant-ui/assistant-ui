"use client";

import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { HighlightedCode } from "codehike/code";
import { Button } from "@/components/ui/button";
import { CodePane } from "@/components/docs/code-slideshow/client";
import type { TapTutorialStep } from "./tutorial-data";

export type TapTutorialClientStep = Omit<
  TapTutorialStep,
  "language" | "code"
> & {
  code: HighlightedCode;
};

const TouchTarget = () => (
  <span
    className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
    aria-hidden="true"
  />
);

export const TapTutorialPlaygroundClient = ({
  steps,
}: {
  steps: TapTutorialClientStep[];
}) => {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);

  const step = steps[index]!;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div
      className="not-prose code-slideshow @container my-6"
      data-testid="tap-tutorial-playground"
    >
      <div className="border-fd-border bg-fd-card overflow-hidden rounded-xl border">
        <div className="grid @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CodePane
            steps={steps}
            index={index}
            className="border-fd-border/70 h-80 border-b @3xl:h-[24rem] @3xl:border-r @3xl:border-b-0"
          />
          <div className="flex min-h-64 flex-col gap-4 p-4">
            <p className="text-fd-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Live preview
            </p>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setCount((value) => value - 1)}
                  aria-label="Decrement"
                  className="border-fd-border bg-fd-background hover:bg-fd-accent flex w-12 cursor-pointer items-center justify-center rounded-lg border shadow-xs transition-colors active:scale-95"
                >
                  <MinusIcon className="size-4" />
                </button>
                <output
                  aria-live="polite"
                  className="border-fd-border bg-fd-background flex min-w-24 items-center justify-center rounded-lg border px-6 py-3 font-mono text-2xl font-medium tabular-nums shadow-xs"
                >
                  {count}
                </output>
                <button
                  type="button"
                  onClick={() => setCount((value) => value + 1)}
                  aria-label="Increment"
                  className="border-fd-border bg-fd-background hover:bg-fd-accent flex w-12 cursor-pointer items-center justify-center rounded-lg border shadow-xs transition-colors active:scale-95"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <p className="text-fd-muted-foreground text-center text-xs text-balance">
                The same counter on every step — right now powered by{" "}
                <span className="text-fd-foreground font-medium">
                  {step.poweredBy}
                </span>
                .
              </p>
            </div>

            <div>
              <p className="text-fd-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
                State
              </p>
              <pre className="border-fd-border/70 bg-fd-background overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed">
                {JSON.stringify({ count }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-fd-border/70 flex min-w-0 flex-col gap-4 border-t p-5 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-10">
          <div
            className="flex max-w-2xl min-w-0 flex-col gap-1"
            aria-live="polite"
          >
            <p className="text-fd-muted-foreground text-sm font-medium tabular-nums">
              Step {index + 1} of {steps.length}
            </p>
            <h3 className="text-lg font-semibold text-balance">{step.title}</h3>
            <p className="text-fd-muted-foreground text-sm">{step.prose}</p>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 @2xl:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={isFirst}
              className="text-fd-muted-foreground hover:text-fd-foreground relative"
            >
              <TouchTarget />
              <ChevronLeftIcon data-icon="inline-start" />
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => setIndex(isLast ? 0 : index + 1)}
              className="relative"
            >
              <TouchTarget />
              {isLast ? (
                <>
                  <RotateCcwIcon data-icon="inline-start" />
                  Start over
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon data-icon="inline-end" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
