/**
 * Differential parity harness.
 *
 * tap's hooks are React's hooks (imported from "react" and resolved through
 * the dispatcher inside resource renders), so the same scenario body can run
 * in four environments:
 *
 *  1. react         - as a component under <StrictMode>
 *  2. bridge        - as a resource hosted via useResource inside <StrictMode>
 *  3. tapRoot       - inside useTapRoot(function Root() {...}) in a component
 *  4. createTapRoot - as a resource under createTapRoot (no React host)
 *
 * Each test runs the scenario in the react environment to capture the
 * expected event log, then asserts the tap environments produce the identical
 * log. React is the source of truth; there are no hand-maintained expected
 * sequences to drift.
 *
 * The whole suite runs twice via vitest projects: once with NODE_ENV=test
 * (dev React build, StrictMode double-invocation, tap devStrictMode) and once
 * with NODE_ENV=production (prod React build, StrictMode inert, tap strict
 * emulation off). React's prod build throws on act(), so this harness avoids
 * act entirely: renders and event-handler updates are forced with flushSync /
 * flushTapSync, and async work (passive effects, schedulers, promises) is
 * absorbed by settling on a timer.
 */
import { describe, it, expect } from "vitest";
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { resource } from "../../core/resource";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useResource } from "../../hooks/useResource";
import { useTapRoot } from "../../hooks/useTapRoot";

/** Mirrors tap's core/helpers/env so scenarios can branch on the mode. */
export const isDevMode = process.env.NODE_ENV !== "production";

// We deliberately do not use act(): it does not exist in prod React builds.
// Silence the dev-build "not wrapped in act" warning machinery.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

export type Log = (event: string) => void;

export type DriveContext = {
  /** Latest value returned by the scenario body. */
  api: () => any;
  /** Dispatch an update like an event handler would, then settle. */
  act: (fn: () => void) => Promise<void>;
  /** Wait for async work (promises, scheduler flushes) to settle. */
  settle: () => Promise<void>;
};

export type TapEnv = "bridge" | "tapRoot" | "createTapRoot";
export const TAP_ENVS = ["bridge", "tapRoot", "createTapRoot"] as const;

export type Scenario = {
  name: string;
  use: (log: Log) => any;
  drive?: (ctx: DriveContext) => void | Promise<void>;
  unmountAtEnd?: boolean;
  /**
   * Documented divergences, keyed by tap environment:
   * - "multiset": same events must occur, order may differ. Used for the
   *   bridge, where a dispatch rides through the host's React reducer so the
   *   eager invocation of an impure updater is deferred to the host's next
   *   render. Invocation multiset and final state must still match React.
   * - "skip": environment intentionally not compared (assert the divergent
   *   behavior in a dedicated test instead).
   */
  divergence?: Partial<Record<TapEnv, "multiset" | "skip">>;
};

// Settle until two consecutive windows pass without new events, so delayed
// timers under suite load (parallel test files compete for CPU) cannot
// truncate a log.
const makeSettle = (events: string[]) => async () => {
  let quiet = 0;
  while (quiet < 2) {
    const prev = events.length;
    await new Promise<void>((r) => setTimeout(r, 20));
    quiet = events.length === prev ? quiet + 1 : 0;
  }
};

type Host = {
  api: () => any;
  /** Synchronously flush an event-handler-style update. */
  flush: (fn: () => void) => void;
  unmount: () => void;
};

/** Shared React host for the react, bridge and tapRoot environments. */
const mountReactHost = (
  useProbeBody: (log: Log) => () => any,
  log: Log,
): Host => {
  let api: () => any = () => undefined;
  function Probe() {
    api = useProbeBody(log);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  // createElement instead of JSX so the harness is independent of the
  // dev/prod jsx runtime split (jsxDEV does not exist in prod builds).
  flushSync(() =>
    root.render(createElement(StrictMode, null, createElement(Probe))),
  );
  return {
    api: () => api(),
    flush: (fn) => flushSync(fn),
    unmount: () => flushSync(() => root.unmount()),
  };
};

const mountEnv = (
  env: "react" | TapEnv,
  scenario: Scenario,
  log: Log,
): Host => {
  switch (env) {
    case "react":
      return mountReactHost((log) => {
        const value = scenario.use(log);
        return () => value;
      }, log);
    case "bridge": {
      const useScenario = (props: { log: Log }) => scenario.use(props.log);
      const Scenario = resource(useScenario);
      return mountReactHost((log) => {
        const value = useResource(Scenario({ log }));
        return () => value;
      }, log);
    }
    case "tapRoot": {
      const host = mountReactHost((log) => {
        const root = useTapRoot(function Root() {
          return scenario.use(log);
        });
        return () => root.getValue();
      }, log);
      // Updates inside the tap root are scheduled by tap, not React.
      return { ...host, flush: (fn) => flushTapSync(fn) };
    }
    case "createTapRoot": {
      const root = createTapRoot(function Root() {
        return scenario.use(log);
      });
      return {
        api: () => root.getValue(),
        flush: (fn) => flushTapSync(fn),
        unmount: () => root.unmount(),
      };
    }
  }
};

export const runScenario = async (
  env: "react" | TapEnv,
  scenario: Scenario,
): Promise<string[]> => {
  const events: string[] = [];
  // The run ends before the host is torn down; stop logging so the teardown's
  // effect cleanups don't leak into the captured log.
  let done = false;
  const log: Log = (e) => void (done || events.push(e));
  const settle = makeSettle(events);

  const host = mountEnv(env, scenario, log);
  await settle();
  await scenario.drive?.({
    api: host.api,
    act: async (fn) => {
      host.flush(fn);
      await settle();
    },
    settle,
  });
  await settle();
  if (scenario.unmountAtEnd) {
    host.unmount();
    await settle();
  }
  done = true;
  if (!scenario.unmountAtEnd) host.unmount();
  return events;
};

/**
 * Generates a describe block per scenario asserting each tap environment
 * produces the exact event log React produces. The react run is shared
 * across the three comparisons.
 */
export const describeParity = (scenarios: Scenario[]) => {
  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      let reactLog: Promise<string[]> | undefined;
      const getReactLog = () => (reactLog ??= runScenario("react", scenario));

      for (const env of TAP_ENVS) {
        const divergence = scenario.divergence?.[env];
        if (divergence === "skip") continue;

        it(`${env} matches react`, async () => {
          const expected = await getReactLog();
          expect(expected.length).toBeGreaterThan(0);
          const actual = await runScenario(env, scenario);
          if (divergence === "multiset") {
            expect([...actual].sort()).toEqual([...expected].sort());
          } else {
            expect(actual).toEqual(expected);
          }
        });
      }
    });
  }
};
