/**
 * Ref hook benchmark: many ref cells in one host.
 *
 *   pnpm build --filter=@assistant-ui/tap
 *   pnpm --dir packages/tap exec vitest bench --run --project prod src/__tests__/bench/ref-hooks.bench.tsx
 */
/* oxlint-disable react/rules-of-hooks -- fixed-count hook loops, benchmark only */
import { bench, describe } from "vitest";
import { createElement, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createTapRoot, flushTapSync } from "@assistant-ui/tap";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const N = 10_000;

type Host = {
  bump: () => void;
  unmount: () => void;
};

const tapUseRef = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  const root = createTapRoot(function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useRef(i).current;
    }
    return sum;
  });

  return {
    bump: () => flushTapSync(() => setTick((v) => v + 1)),
    unmount: () => root.unmount(),
  };
};

const reactUseRef = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useRef(i).current;
    }
    return sum;
  }

  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(Root)));

  return {
    bump: () => flushSync(() => setTick((v) => v + 1)),
    unmount: () => flushSync(() => root.unmount()),
  };
};

describe(`mount+unmount, ${N} useRef hooks`, () => {
  const hosts = {
    "react:useRef": reactUseRef,
    "tap:useRef": tapUseRef,
  };

  for (const [name, make] of Object.entries(hosts)) {
    bench(name, () => {
      const host = make();
      host.unmount();
    });
  }
});

describe(`stable update, ${N} useRef hooks`, () => {
  const hosts = {
    "react:useRef": reactUseRef,
    "tap:useRef": tapUseRef,
  };

  for (const [name, make] of Object.entries(hosts)) {
    let host: Host;
    bench(name, () => host.bump(), {
      setup: () => {
        host = make();
      },
      teardown: () => host.unmount(),
    });
  }
});
