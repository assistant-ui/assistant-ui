/**
 * Baseline parity scenarios: mount/render counts, strict-mode ghost
 * invocations, memo caching, effect lifecycles, setState batching, async
 * updates, unmount. Runs in dev and prod via the vitest projects.
 */
/* oxlint-disable react/exhaustive-deps -- intentional missing-dep patterns are part of the scenarios */
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { describeParity, type Scenario } from "./describeParity";

const scenarios: Scenario[] = [
  {
    name: "mount: render count, useState initializer ghost-invoked, first result kept",
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
    name: "useMemo: first returned instance is the one kept",
    use: (log) => {
      let instance = 0;
      const obj = useMemo(() => ({ instance: ++instance }), []);
      const first = useRef(obj);
      log(`instance=${obj.instance} identity-stable=${first.current === obj}`);
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
    drive: async ({ api, act }) => {
      await act(() => api().dispatch(1));
    },
  },
  {
    name: "effects cycle mount, strict remount, deps",
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
    name: "event-handler setState: single re-render, updater ghost-invoked",
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
    drive: async ({ api, act }) => {
      await act(() => api().increment());
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
    drive: async ({ api, act }) => {
      await act(() => api().both());
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
          // The cleanup matters: without it the strict double effect-mount
          // schedules two timers, and whether their dispatches batch into one
          // render is a race between the timer phase and the schedulers.
          const timer = setTimeout(() => {
            log("timeout");
            setCount(1);
          }, 5);
          return () => clearTimeout(timer);
        }
        return undefined;
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
    drive: async ({ api, act }) => {
      await act(() => api().dispatch(0));
    },
  },
  {
    name: "updater returning a different value per invocation",
    divergence: { bridge: "multiset" },
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
    name: "render-phase update: setState during render re-renders before committing",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      if (count === 0) setCount(1);
    },
  },
  {
    name: "unmount runs cleanups",
    use: (log) => {
      useEffect(() => {
        log("mount-1");
        return () => log("unmount-1");
      }, []);
      useEffect(() => {
        log("mount-2");
        return () => log("unmount-2");
      }, []);
    },
    unmountAtEnd: true,
  },
];

describeParity(scenarios);
