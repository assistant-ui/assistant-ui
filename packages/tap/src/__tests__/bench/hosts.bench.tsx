/**
 * Host-type benchmark: mount+unmount and update cost of a body with N
 * hooks under each host. Runs against the BUILT package (dist), which the
 * vitest config externalizes so tap and React both run as plain Node
 * modules, outside vitest's module evaluator. Build first, then:
 *
 *   pnpm build
 *   pnpm exec vitest bench --run --project prod src/__tests__/bench/hosts.bench.tsx
 *
 * Not part of the test suite; vitest only picks this up in bench mode.
 */
/* oxlint-disable react/rules-of-hooks -- fixed-count hook loop, benchmark only */
import { bench, describe } from "vitest";
import { createElement, useState } from "react";
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

const N = 10_000;

type Api = { sum: number; bump: () => void };

const useManyHooks = (): Api => {
  let sum = 0;
  let lastSet!: (updater: (v: number) => number) => void;
  for (let i = 0; i < N; i++) {
    const [v, setV] = useState(0);
    sum += v;
    lastSet = setV;
  }
  return { sum, bump: () => lastSet((v) => v + 1) };
};

type Host = {
  api: () => Api;
  flush: (fn: () => void) => void;
  unmount: () => void;
};

const mountReactHost = (useProbe: () => () => Api): Host => {
  let api!: () => Api;
  function Probe() {
    api = useProbe();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(Probe)));
  return {
    api: () => api(),
    flush: (fn) => flushSync(fn),
    unmount: () => flushSync(() => root.unmount()),
  };
};

const ManyHooks = resource(useManyHooks);

const HOSTS: Record<string, () => Host> = {
  react: () =>
    mountReactHost(() => {
      const value = useManyHooks();
      return () => value;
    }),
  bridge: () =>
    mountReactHost(() => {
      const value = useResource(ManyHooks());
      return () => value;
    }),
  tapRoot: () => {
    const host = mountReactHost(() => {
      const root = useTapRoot(function Root() {
        return useManyHooks();
      });
      return () => root.getValue();
    });
    return { ...host, flush: (fn) => flushTapSync(fn) };
  },
  createTapRoot: () => {
    const root = createTapRoot(function Root() {
      return useManyHooks();
    });
    return {
      api: () => root.getValue(),
      flush: (fn) => flushTapSync(fn),
      unmount: () => root.unmount(),
    };
  },
};

describe(`mount+unmount, ${N} useState hooks`, () => {
  for (const [name, make] of Object.entries(HOSTS)) {
    bench(name, () => {
      const host = make();
      host.unmount();
    });
  }
});

describe(`update (one dispatch, full re-render), ${N} useState hooks`, () => {
  for (const [name, make] of Object.entries(HOSTS)) {
    let host: Host;
    bench(
      name,
      () => {
        host.flush(() => host.api().bump());
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
