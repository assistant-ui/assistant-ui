/**
 * Memo hook benchmark: many memo cells in one resource. Measures stable deps,
 * changing deps, and React Compiler-style memo caches.
 *
 *   pnpm build --filter=@assistant-ui/tap
 *   pnpm --dir packages/tap exec vitest bench --run --project prod src/__tests__/bench/memo-hooks.bench.tsx
 */
/* oxlint-disable react/rules-of-hooks -- fixed-count hook loops, benchmark only */
import { bench, describe } from "vitest";
import { createElement, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createTapRoot, flushTapSync } from "@assistant-ui/tap";
import { c } from "@assistant-ui/tap/react-shim/compiler-runtime";
import { useRenderMemo } from "../../hooks/utils/useRenderMemo";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const N = 1_000;
const MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");

type Host = {
  bump: () => void;
  unmount: () => void;
};

const tapUseMemoStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  const root = createTapRoot(function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useMemo(() => i, [i]);
    }
    return sum;
  });

  return {
    bump: () => flushTapSync(() => setTick((v) => v + 1)),
    unmount: () => root.unmount(),
  };
};

const tapUseMemoChanging = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  const root = createTapRoot(function Root() {
    const [tick, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useMemo(() => i + tick, [i, tick]);
    }
    return sum;
  });

  return {
    bump: () => flushTapSync(() => setTick((v) => v + 1)),
    unmount: () => root.unmount(),
  };
};

const tapCStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  const root = createTapRoot(function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      const $ = c(2);
      if ($[0] === MEMO_CACHE_SENTINEL) {
        $[0] = i;
        $[1] = i;
      }
      sum += $[1] as number;
    }
    return sum;
  });

  return {
    bump: () => flushTapSync(() => setTick((v) => v + 1)),
    unmount: () => root.unmount(),
  };
};

const reactUseMemoStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useMemo(() => i, [i]);
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

const reactUseMemoChanging = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  function Root() {
    const [tick, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useMemo(() => i + tick, [i, tick]);
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

const reactCStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      const $ = c(2);
      if ($[0] === MEMO_CACHE_SENTINEL) {
        $[0] = i;
        $[1] = i;
      }
      sum += $[1] as number;
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

const reactUseRenderMemoStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useRenderMemo(() => i, [i]);
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

const tapUseRenderMemoStable = (): Host => {
  let setTick!: (updater: (value: number) => number) => void;

  const root = createTapRoot(function Root() {
    const [, set] = useState(0);
    setTick = set;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += useRenderMemo(() => i, [i]);
    }
    return sum;
  });

  return {
    bump: () => flushTapSync(() => setTick((v) => v + 1)),
    unmount: () => root.unmount(),
  };
};

describe(`memo hooks stable update, ${N} cells`, () => {
  const hosts = {
    "react:useMemo": reactUseMemoStable,
    "tap:useMemo": tapUseMemoStable,
    "react:c": reactCStable,
    "tap:c": tapCStable,
    "react:useRenderMemo": reactUseRenderMemoStable,
    "tap:useRenderMemo": tapUseRenderMemoStable,
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

describe(`memo hooks changing update, ${N} cells`, () => {
  const hosts = {
    "react:useMemo": reactUseMemoChanging,
    "tap:useMemo": tapUseMemoChanging,
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
