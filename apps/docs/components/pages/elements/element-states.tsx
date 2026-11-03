"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { DemoStage } from "@/components/demo/elements/demo-stage";
import { getElementStates } from "@/components/demo/elements/states";
import {
  DEFAULT_STATE_KEY,
  type ElementState,
} from "@/components/demo/elements/states/types";

const PARAM = "state";

function readStateParam(states: readonly ElementState[]): string {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  return states.some((state) => state.key === value)
    ? value!
    : DEFAULT_STATE_KEY;
}

function writeStateParam(key: string) {
  const url = new URL(window.location.href);
  if (key === DEFAULT_STATE_KEY) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, key);
  window.history.replaceState(window.history.state, "", url);
}

export function ElementStatesPreview({
  slug,
  caption,
  canvasClassName,
  children,
}: {
  slug: string;
  /** Caption of the live demo; a fixture state replaces its tail with the state note. */
  caption: string;
  canvasClassName: string;
  /** The live demo, shown for the `default` state. */
  children: React.ReactNode;
}) {
  const states = getElementStates(slug);
  const [key, setKey] = useState(DEFAULT_STATE_KEY);

  useEffect(() => {
    if (!states) return;
    const sync = () => setKey(readStateParam(states));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [states]);

  const active =
    states?.find((state) => state.key === key) ?? states?.[0] ?? null;
  const Fixture = active?.key === DEFAULT_STATE_KEY ? null : active?.Component;

  const select = (next: string) => {
    setKey(next);
    writeStateParam(next);
  };

  return (
    <figure className="mt-10">
      {states && states.length > 1 && (
        <StateSwitcher
          states={states}
          activeKey={active!.key}
          onSelect={select}
        />
      )}
      {Fixture ? (
        <div
          className={cn(demoCanvasClass, canvasClassName)}
          data-element-state={active!.key}
        >
          <DemoStage key={active!.key} replay={false}>
            <Fixture />
          </DemoStage>
        </div>
      ) : (
        children
      )}
      <figcaption className="text-muted-foreground mt-2.5 text-xs">
        {Fixture
          ? `fig. 01 · ${active!.label.toLowerCase()}${active!.note ? `: ${active!.note}` : ""}`
          : caption}
      </figcaption>
    </figure>
  );
}

function StateSwitcher({
  states,
  activeKey,
  onSelect,
}: {
  states: readonly ElementState[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = states.findIndex((state) => state.key === activeKey);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (current + 1) % states.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (current - 1 + states.length) % states.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = states.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(states[next]!.key);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Preview state"
      onKeyDown={onKeyDown}
      className="mb-2.5 flex [scrollbar-width:none] items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
    >
      {states.map((state, index) => {
        const selected = state.key === activeKey;
        return (
          <button
            key={state.key}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(state.key)}
            className={cn(
              "h-6 shrink-0 rounded-sm px-2 text-xs font-medium whitespace-nowrap transition-colors motion-reduce:transition-none",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-2",
              selected
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {state.label}
          </button>
        );
      })}
    </div>
  );
}
