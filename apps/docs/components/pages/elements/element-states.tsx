"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { DemoStage } from "@/components/demo/elements/demo-stage";
import {
  DEFAULT_ONLY_STATE_SLUGS,
  ELEMENT_STATES,
} from "@/components/demo/elements/states";
import {
  DEFAULT_STATE_KEY,
  type ElementState,
  type ElementStates,
  type ElementStatesSource,
} from "@/components/demo/elements/states/types";

const PARAM = "state";

const STATE_CHANGE = "element-state-change";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(STATE_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(STATE_CHANGE, onChange);
  };
}

const readStateParam = () =>
  new URLSearchParams(window.location.search).get(PARAM);

// Fixtures mount only after hydration, so the server always shows the live demo.
const readServerStateParam = () => null;

// A click adds a history entry, so Back returns to the previous state. Arrow,
// Home, and End replace it, so stepping through a long list does not fill the
// back stack.
type HistoryMode = "push" | "replace";

function writeStateParam(key: string, mode: HistoryMode) {
  const url = new URL(window.location.href);
  if (key === DEFAULT_STATE_KEY) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, key);
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(STATE_CHANGE));
}

function pickStates(
  source: ElementStatesSource | undefined,
  slug: string,
): ElementStates | undefined {
  if (!source) return undefined;
  if (Array.isArray(source)) return source as ElementStates;
  return (source as Readonly<Record<string, ElementStates>>)[slug];
}

type PreviewProps = {
  slug: string;
  /** Caption of the live demo; a fixture state replaces it with the state note. */
  caption: string;
  canvasClassName: string;
  /** The live demo, shown for the `default` state. */
  children: React.ReactNode;
};

// Each element's states load on their own, so a page downloads only its own
// fixtures. `undefined` is still loading, `null` means the element has none.
const loadedStates = new Map<string, ElementStates | null>();
const statesListeners = new Set<() => void>();

function subscribeStates(onChange: () => void) {
  statesListeners.add(onChange);
  return () => {
    statesListeners.delete(onChange);
  };
}

const requested = new Set<string>();

function requestStates(slug: string) {
  if (requested.has(slug)) return;
  requested.add(slug);
  const settle = (states: ElementStates | null) => {
    loadedStates.set(slug, states);
    for (const listener of statesListeners) listener();
  };
  const load = ELEMENT_STATES[slug];
  if (!load) return settle(null);
  load().then(
    (source) => settle(pickStates(source, slug) ?? null),
    () => {
      // A failed chunk leaves the live demo without a switcher; a later
      // visit to the page tries again.
      requested.delete(slug);
      settle(null);
    },
  );
}

const noStatesOnServer = () => undefined;

/**
 * The states for `slug`, loaded after hydration. The live demo never waits on
 * them and stays mounted when they arrive; the switcher's row is held empty
 * until then so nothing below it moves.
 */
function useElementStates(slug: string) {
  useEffect(() => requestStates(slug), [slug]);
  return useSyncExternalStore(
    subscribeStates,
    () => loadedStates.get(slug),
    noStatesOnServer,
  );
}

export function ElementStatesPreview({ slug, ...props }: PreviewProps) {
  const states = useElementStates(slug);
  return (
    <ElementStatesFigure
      {...props}
      states={states ?? undefined}
      reserveSwitcher={
        states === undefined && !DEFAULT_ONLY_STATE_SLUGS.has(slug)
      }
    />
  );
}

export function ElementStatesFigure({
  states,
  reserveSwitcher = false,
  caption,
  canvasClassName,
  children,
}: Omit<PreviewProps, "slug"> & {
  states: ElementStates | undefined;
  /** Holds the switcher's row while the states load, so the demo does not jump. */
  reserveSwitcher?: boolean;
}) {
  const key = useSyncExternalStore(
    subscribe,
    readStateParam,
    readServerStateParam,
  );

  const active =
    states?.find((state) => state.key === key) ?? states?.[0] ?? null;
  const Fixture = active?.key === DEFAULT_STATE_KEY ? null : active?.Component;

  const select = (next: string, mode: HistoryMode) => {
    if (next !== active?.key) writeStateParam(next, mode);
  };

  return (
    <figure className="mt-10">
      {reserveSwitcher && <div aria-hidden className="mb-2.5 h-6" />}
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
          ? `fig. 01 · ${active!.label}${active!.note ? `: ${active!.note}` : ""}`
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
  onSelect: (key: string, mode: HistoryMode) => void;
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
    onSelect(states[next]!.key, "replace");
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
            onClick={() => onSelect(state.key, "push")}
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
