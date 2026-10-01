"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  AgentCursor,
  type AgentCursorProps,
} from "@/components/ui/agent-cursor";
import { AgentCursor as RadixAgentCursor } from "@/components/ui/radix/agent-cursor";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

function CursorDemo({ Cursor }: { Cursor: ComponentType<AgentCursorProps> }) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const secondRef = useRef<HTMLButtonElement>(null);
  const nextTarget = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [completed, setCompleted] = useState([false, false]);
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  const [phase, setPhase] = useState<AgentCursorProps["phase"]>("idle");
  const [running, setRunning] = useState(false);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const run = () => {
    const button =
      nextTarget.current % 2 === 0 ? firstRef.current : secondRef.current;
    if (!button) return;
    nextTarget.current += 1;
    timers.current.forEach(clearTimeout);
    setTarget(button);
    setPhase("moving");
    setRunning(true);
    const movement = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 120
      : 620;
    timers.current = [
      setTimeout(() => {
        setPhase("clicking");
        button.click();
      }, movement),
      setTimeout(() => {
        setPhase("idle");
        setRunning(false);
      }, movement + 700),
    ];
  };

  return (
    <SampleFrame className="flex h-auto min-h-64 flex-col items-center justify-center gap-7 px-5 py-8">
      <div className="flex flex-wrap justify-center gap-5">
        {[firstRef, secondRef].map((ref, index) => (
          <button
            key={index}
            ref={ref}
            type="button"
            aria-pressed={completed[index]}
            onClick={() =>
              setCompleted((current) =>
                current.map((value, at) => (at === index ? !value : value)),
              )
            }
            className="bg-foreground/[0.025] hover:bg-foreground/[0.05] rounded-control flex items-center gap-3 px-5 py-3 text-sm"
          >
            <span
              aria-hidden="true"
              className="border-foreground/20 flex size-4 items-center justify-center rounded-sm border text-xs"
            >
              {completed[index] ? "✓" : ""}
            </span>
            Task {String(index + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={running}
          onClick={run}
          className="bg-foreground text-background rounded-control px-4 py-2 text-sm disabled:opacity-50"
        >
          {running ? "Running action…" : "Run task action"}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground text-xs"
        >
          {completed.filter(Boolean).length} of 2 tasks completed
        </p>
      </div>
      <Cursor target={target} phase={phase ?? "idle"} visible={running} />
    </SampleFrame>
  );
}

export function AgentCursorSample() {
  return <CursorDemo Cursor={AgentCursor} />;
}
export function AgentCursorRadixSample() {
  return <CursorDemo Cursor={RadixAgentCursor} />;
}
