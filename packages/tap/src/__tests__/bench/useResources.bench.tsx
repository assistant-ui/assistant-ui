/**
 * useResources benchmark: N keyed child resources with K hooks each. Measures
 * the three hot paths against dist:
 *   - mount+unmount the whole list
 *   - one child dispatches its own state (only that child is dirty)
 *   - the parent rebuilds the elements array (new identity, same items)
 *
 *   pnpm build
 *   pnpm exec vitest bench --run --project prod src/__tests__/bench/useResources.bench.tsx
 */
/* oxlint-disable react/rules-of-hooks -- fixed-count hook loops, benchmark only */
import { bench, describe } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { resource, useResources, withKey } from "@assistant-ui/tap";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const N = 500;
const K = 10;

type Bump = (updater: (v: number) => number) => void;
const childSetters: Bump[] = [];

const useLeafBody = (id: number): number => {
  let sum = 0;
  let set!: Bump;
  for (let i = 0; i < K; i++) {
    const [v, setV] = useState(0);
    sum += v;
    set = setV;
  }
  childSetters[id] = set;
  return sum;
};

const Leaf = resource((props: { id: number }) => useLeafBody(props.id));

const ids = Array.from({ length: N }, (_, i) => i);
// `deps: false` -> no bailout deps (every child re-renders); `true` -> stable
// per-id deps so unchanged children bail.
const buildElements = (deps: boolean) =>
  ids.map((id) =>
    deps ? withKey(id, Leaf({ id }), [id]) : withKey(id, Leaf({ id })),
  );

type Host = {
  flush: (fn: () => void) => void;
  bumpParent: () => void;
  unmount: () => void;
};

const make = (deps: boolean): Host => {
  let setTick!: (n: number) => void;
  function List() {
    const [, set] = useState(0);
    setTick = set;
    useResources(buildElements(deps));
    return null;
  }
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(List)));
  let tick = 0;
  return {
    flush: (fn) => flushSync(fn),
    bumpParent: () => flushSync(() => setTick(++tick)),
    unmount: () => flushSync(() => root.unmount()),
  };
};

const VARIANTS = { "no-deps": false, deps: true } as const;

describe(`useResources mount+unmount, ${N} children x ${K} hooks`, () => {
  for (const [name, deps] of Object.entries(VARIANTS)) {
    bench(name, () => make(deps).unmount());
  }
});

describe(`useResources: one child dispatch, ${N} children x ${K} hooks`, () => {
  for (const [name, deps] of Object.entries(VARIANTS)) {
    let host: Host;
    bench(name, () => host.flush(() => childSetters[N >> 1]!((v) => v + 1)), {
      setup: () => {
        host = make(deps);
      },
      teardown: () => host.unmount(),
    });
  }
});

describe(`useResources: rebuild elements array, ${N} children x ${K} hooks`, () => {
  for (const [name, deps] of Object.entries(VARIANTS)) {
    let host: Host;
    bench(name, () => host.bumpParent(), {
      setup: () => {
        host = make(deps);
      },
      teardown: () => host.unmount(),
    });
  }
});
