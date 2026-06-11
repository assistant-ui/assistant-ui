/**
 * Differential StrictMode parity suite.
 *
 * tap's hooks are React's hooks (imported from "react" and resolved through the
 * dispatcher inside resource renders), so the same scenario body can run in
 * three worlds:
 *
 *  1. react    — as a component under <StrictMode>
 *  2. bridge   — as a resource hosted via useResource inside <StrictMode>
 *  3. tap root — as a resource under createTapRoot (self-emulated strict mode)
 *
 * Each test runs the scenario in the react world to capture the expected event
 * log, then asserts the tap worlds produce the identical log. React is the
 * source of truth; there are no hand-maintained expected sequences to drift.
 */
/* oxlint-disable react/exhaustive-deps -- intentional missing-dep patterns are part of the scenarios */

import { describe, it, expect, afterEach } from "vitest";
import {
  StrictMode,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { render, act, cleanup } from "@testing-library/react";
import { resource } from "../../core/resource";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useResource } from "../../index";
import { cleanupAllResources } from "../test-utils";

type Log = (event: string) => void;

type DriveContext = {
  /** Latest value returned by the scenario body. */
  api: () => any;
  /** Dispatch an update like an event handler would (act / flushTapSync). */
  act: (fn: () => void) => void;
  /** Wait for async work (promises, scheduler flushes) to settle. */
  settle: () => Promise<void>;
};

type Scenario = {
  name: string;
  use: (log: Log) => any;
  drive?: (ctx: DriveContext) => void | Promise<void>;
  unmountAtEnd?: boolean;
  /**
   * Documented divergence: in the bridge world, a dispatch rides through the
   * host's React reducer so tap state stays replayable under concurrent React.
   * The dispatch-time eager invocation of an updater is therefore deferred to
   * the host's next render. Only the ORDER of invocations differs (and only
   * for impure updaters, which the log is a detector for); the invocation
   * multiset and final state must still match React exactly.
   */
  bridgeDefersEagerInvocation?: boolean;
};

const settleDelay = () => new Promise<void>((r) => setTimeout(r, 30));

/** Shared React driver for the `react` and `bridge` worlds. */
const runInReact = async (
  scenario: Scenario,
  useBody: (log: Log) => any,
): Promise<string[]> => {
  const events: string[] = [];
  // The run ends before the view is torn down; stop logging so the teardown's
  // effect cleanups don't leak into the captured log.
  let done = false;
  const log: Log = (e) => void (done || events.push(e));
  let api: any;
  function Probe() {
    api = useBody(log);
    return null;
  }
  const view = render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );
  await scenario.drive?.({
    api: () => api,
    act: (fn) => act(fn),
    settle: () => act(settleDelay),
  });
  if (scenario.unmountAtEnd) view.unmount();
  done = true;
  return events;
};

const runReact = (scenario: Scenario) =>
  runInReact(scenario, (log) => scenario.use(log));

const runBridge = (scenario: Scenario) => {
  const useScenario = (props: { log: Log }) => scenario.use(props.log);
  const Scenario = resource(useScenario);
  return runInReact(scenario, (log) => useResource(Scenario({ log })));
};

const runTapRoot = async (scenario: Scenario): Promise<string[]> => {
  const events: string[] = [];
  const log: Log = (e) => events.push(e);
  const root = createTapRoot(function Root() {
    return scenario.use(log);
  });
  await scenario.drive?.({
    api: () => root.getValue(),
    act: (fn) => flushTapSync(fn),
    settle: settleDelay,
  });
  if (scenario.unmountAtEnd) root.unmount();
  return events;
};

const scenarios: Scenario[] = [
  {
    name: "mount: double render, useState initializer ghost-invoked, first result kept",
    use: (log) => {
      const [a] = useState(() => {
        log("init-a");
        return 1;
      });
      const [b] = useState(() => {
        log("init-b");
        return 2;
      });
      log(`render a=${a} b=${b}`);
    },
  },
  {
    name: "useMemo: ghost-invoked when computing, cached across passes and re-renders",
    use: (log) => {
      const [n, setN] = useState(0);
      useMemo(() => {
        log(`memo n=${n}`);
        return n;
      }, [n]);
      log(`render n=${n}`);
      useEffect(() => {
        if (n === 0) setN(1);
      }, [n]);
    },
  },
  {
    name: "memo identity is stable across the strict double render",
    use: (log) => {
      const obj = useMemo(() => ({}), []);
      const first = useRef(obj);
      log(`identity-stable=${first.current === obj}`);
    },
  },
  {
    name: "useReducer: initializer ghost-invoked, first result kept",
    use: (log) => {
      let initCount = 0;
      const [state] = useReducer(
        (s: number, a: number) => s + a,
        0,
        (arg: number) => {
          initCount++;
          log(`init-${initCount}`);
          return arg + initCount * 10;
        },
      );
      log(`render state=${state}`);
    },
  },
  {
    name: "useReducer: dispatch reducer ghost-invoked",
    use: (log) => {
      const countRef = useRef(0);
      const [state, dispatch] = useReducer((s: number, _a: number) => {
        countRef.current++;
        const result = countRef.current * 100;
        log(`reducer-${countRef.current} state=${s} -> ${result}`);
        return result;
      }, 0);
      log(`render state=${state}`);
      return { dispatch };
    },
    drive: ({ api, act }) => {
      act(() => api().dispatch(1));
    },
  },
  {
    name: "effects cycle mount → unmount → mount",
    use: (log) => {
      const [n] = useState(0);
      useEffect(() => {
        log("e1-mount");
        return () => log("e1-unmount");
      });
      useEffect(() => {
        log("e2-mount");
        return () => log("e2-unmount");
      }, []);
      useEffect(() => {
        log(`e3-mount n=${n}`);
        return () => log(`e3-unmount n=${n}`);
      }, [n]);
    },
  },
  {
    name: "setState in effect",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      useEffect(() => {
        log(`effect ${count}`);
        if (count === 0) setCount(1);
        return () => log(`cleanup ${count}`);
      }, [count]);
    },
  },
  {
    name: "event-handler setState: single double render, updater ghost-invoked",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      return {
        increment: () =>
          setCount((prev) => {
            log(`updater prev=${prev}`);
            return prev + 1;
          }),
      };
    },
    drive: ({ api, act }) => {
      act(() => api().increment());
    },
  },
  {
    name: "event-handler setState: multiple setStates batch into one render",
    use: (log) => {
      const [a, setA] = useState(0);
      const [b, setB] = useState(0);
      log(`render a=${a} b=${b}`);
      return {
        both: () => {
          setA(1);
          setB(2);
        },
      };
    },
    drive: ({ api, act }) => {
      act(() => api().both());
    },
  },
  {
    name: "async setState from a promise scheduled in an effect",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      useEffect(() => {
        if (count === 0) {
          void Promise.resolve().then(() => {
            log("promise");
            setCount(1);
          });
        }
      }, [count]);
    },
    drive: ({ settle }) => settle(),
  },
  {
    name: "async setState from a setTimeout scheduled in an effect",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      useEffect(() => {
        if (count === 0) {
          setTimeout(() => {
            log("timeout");
            setCount(1);
          }, 5);
        }
      }, [count]);
    },
    drive: ({ settle }) => settle(),
  },
  {
    name: "setState from the first strict effect mount survives its cleanup",
    use: (log) => {
      const [count, setCount] = useState(0);
      const runs = useRef(0);
      log(`render ${count}`);
      useEffect(() => {
        runs.current++;
        const n = runs.current;
        log(`mount#${n} count=${count}`);
        if (n === 1) setCount(1);
        return () => log(`cleanup#${n}`);
      }, []);
    },
  },
  {
    name: "setState from both strict effect mounts: last value wins",
    use: (log) => {
      const [count, setCount] = useState(0);
      const runs = useRef(0);
      log(`render ${count}`);
      useEffect(() => {
        runs.current++;
        const n = runs.current;
        log(`mount#${n} count=${count}`);
        setCount(n === 1 ? 1 : 2);
        return () => log(`cleanup#${n}`);
      }, []);
    },
  },
  {
    name: "updater setState from both strict effect mounts chains",
    use: (log) => {
      const [count, setCount] = useState(0);
      const runs = useRef(0);
      log(`render ${count}`);
      useEffect(() => {
        runs.current++;
        const n = runs.current;
        setCount((prev) => {
          log(`updater#${n} prev=${prev}`);
          return prev + n;
        });
      }, []);
    },
  },
  {
    name: "useReducer: dispatching the same state",
    use: (log) => {
      const [state, dispatch] = useReducer((s: number) => s, 42);
      log(`render ${state}`);
      return { dispatch };
    },
    drive: ({ api, act }) => {
      act(() => api().dispatch(0));
    },
  },
  {
    name: "updater returning a different value per invocation",
    bridgeDefersEagerInvocation: true,
    use: (log) => {
      const [count, setCount] = useState(0);
      const calls = useRef(0);
      log(`render ${count}`);
      useEffect(() => {
        log("effect mount");
        setCount((prev) => {
          calls.current++;
          log(`updater call #${calls.current} with prev=${prev}`);
          return calls.current === 1 ? 100 : 200;
        });
        return () => log("effect cleanup");
      }, []);
    },
  },
  {
    name: "unmount runs cleanups",
    use: (log) => {
      useEffect(() => {
        log("mount");
        return () => log("unmount");
      }, []);
    },
    unmountAtEnd: true,
  },
];

describe("StrictMode parity (React vs tap)", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      it("tap-in-React bridge matches React", async () => {
        const reactLog = await runReact(scenario);
        cleanup();
        const bridgeLog = await runBridge(scenario);
        if (scenario.bridgeDefersEagerInvocation) {
          expect([...bridgeLog].sort()).toEqual([...reactLog].sort());
        } else {
          expect(bridgeLog).toEqual(reactLog);
        }
      });

      it("tap root matches React", async () => {
        const reactLog = await runReact(scenario);
        cleanup();
        const tapLog = await runTapRoot(scenario);
        expect(tapLog).toEqual(reactLog);
      });
    });
  }
});

describe("render-phase update: setState during render", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  const use = (log: Log) => {
    const [count, setCount] = useState(0);
    log(`render ${count}`);
    if (count === 0) setCount(1);
  };

  it("React re-renders with the new state", async () => {
    const events = await runInReact({ name: "", use }, (log) => use(log));
    expect(events).toEqual(["render 0", "render 1", "render 1"]);
  });

  it("tap matches", async () => {
    const events = await runTapRoot({ name: "", use });
    expect(events).toEqual(["render 0", "render 1", "render 1"]);
  });
});
