/**
 * Tree-shaped benchmark: M leaf resources with K hooks each; the update
 * scenario dispatches into a single leaf. React renders the leaves as
 * memo'd components, so a clean sibling costs nothing; tap currently
 * re-renders the whole tree (no subtree bailout). This bench exists to
 * measure that gap and to validate the bailout work. Build first, then:
 *
 *   pnpm build
 *   pnpm exec vitest bench --run --project prod src/__tests__/bench/tree.bench.tsx
 */
/* oxlint-disable react/rules-of-hooks -- fixed-count hook loops, benchmark only */
import { bench, describe } from "vitest";
import { createElement, Fragment, memo, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  createTapRoot,
  flushTapSync,
  resource,
  useResource,
  useTapRoot,
} from "@assistant-ui/tap";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const M = 500;
const K = 10;

type Bump = (updater: (v: number) => number) => void;
const leafSetters: Bump[] = [];

const useLeafBody = (id: number): number => {
  let sum = 0;
  let set!: Bump;
  for (let i = 0; i < K; i++) {
    const [v, setV] = useState(0);
    sum += v;
    set = setV;
  }
  leafSetters[id] = set;
  return sum;
};

const Leaf = resource((props: { id: number }) => useLeafBody(props.id));

const useTree = () => {
  let total = 0;
  for (let i = 0; i < M; i++) {
    total += useResource(Leaf({ id: i }));
  }
  return total;
};

const useTreeDeps = () => {
  let total = 0;
  for (let i = 0; i < M; i++) {
    total += useResource(Leaf({ id: i }));
  }
  return total;
};

// Stable element identities, like React Compiler output.
const leafElements = Array.from({ length: M }, (_, id) => Leaf({ id }));
const useTreeStable = () => {
  let total = 0;
  for (let i = 0; i < M; i++) {
    total += useResource(leafElements[i]!);
  }
  return total;
};

const LeafComponent = memo(function LeafComponent({ id }: { id: number }) {
  useLeafBody(id);
  return null;
});

const leafIds = Array.from({ length: M }, (_, i) => i);

type Host = { flush: (fn: () => void) => void; unmount: () => void };

const HOSTS: Record<string, () => Host> = {
  react: () => {
    function Tree() {
      return createElement(
        Fragment,
        null,
        leafIds.map((id) => createElement(LeafComponent, { key: id, id })),
      );
    }
    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(Tree)));
    return {
      flush: (fn) => flushSync(fn),
      unmount: () => flushSync(() => root.unmount()),
    };
  },
  tapRoot: () => {
    function Probe() {
      useTapRoot(function Root() {
        return useTree();
      });
      return null;
    }
    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(Probe)));
    return {
      flush: (fn) => flushTapSync(fn),
      unmount: () => flushSync(() => root.unmount()),
    };
  },
  createTapRoot: () => {
    const root = createTapRoot(function Root() {
      return useTree();
    });
    return {
      flush: (fn) => flushTapSync(fn),
      unmount: () => root.unmount(),
    };
  },
  createTapRootDeps: () => {
    const root = createTapRoot(function Root() {
      return useTreeDeps();
    });
    return {
      flush: (fn) => flushTapSync(fn),
      unmount: () => root.unmount(),
    };
  },
  createTapRootStable: () => {
    const root = createTapRoot(function Root() {
      return useTreeStable();
    });
    return {
      flush: (fn) => flushTapSync(fn),
      unmount: () => root.unmount(),
    };
  },
};

describe(`tree mount+unmount, ${M} leaves x ${K} hooks`, () => {
  for (const [name, make] of Object.entries(HOSTS)) {
    bench(name, () => {
      make().unmount();
    });
  }
});

describe(`tree update: one leaf dispatch, ${M} leaves x ${K} hooks`, () => {
  for (const [name, make] of Object.entries(HOSTS)) {
    let host: Host;
    bench(
      name,
      () => {
        host.flush(() => leafSetters[M >> 1]!((v) => v + 1));
      },
      {
        setup: () => {
          host = make();
        },
        teardown: () => {
          host.unmount();
        },
      },
    );
  }
});
