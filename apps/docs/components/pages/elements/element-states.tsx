"use client";

import {
  lazy,
  Suspense,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { DemoStage } from "@/components/demo/elements/demo-stage";
import { ELEMENT_STATES } from "@/components/demo/elements/states";
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

const lazyFigures = new Map<string, ComponentType<PreviewProps>>();

// One lazy figure per slug, so a page downloads only its own element's
// fixtures. The server renders it in full; after a client navigation the live
// demo shows at once and the switcher joins it when the chunk arrives.
function lazyFigure(slug: string) {
  let Figure = lazyFigures.get(slug);
  if (!Figure) {
    Figure = lazy(async () => {
      const states = pickStates(await ELEMENT_STATES[slug]?.(), slug);
      return {
        default: (props: PreviewProps) => (
          <ElementStatesFigure {...props} states={states} />
        ),
      };
    });
    lazyFigures.set(slug, Figure);
  }
  return Figure;
}

export function ElementStatesPreview(props: PreviewProps) {
  const Figure = lazyFigure(props.slug);
  return (
    <Suspense
      fallback={
        <ElementStatesFigure {...props} states={undefined} reserveSwitcher />
      }
    >
      <Figure {...props} />
    </Suspense>
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
