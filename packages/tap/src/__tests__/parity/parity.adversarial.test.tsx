/**
 * Adversarial parity scenarios: each one was designed to break the
 * React/tap equivalence and survived. Anything that diverged instead is
 * documented in parity.divergences.test.tsx.
 */
/* oxlint-disable react/exhaustive-deps -- intentional missing-dep patterns are part of the scenarios */
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { describeParity, type Scenario } from "./describeParity";

const scenarios: Scenario[] = [
  {
    name: "reducer closing over another reducer's state, batched cross-dispatch",
    use: (log) => {
      const [value, dispatch] = useReducer((s: number, a: number) => {
        log(`r1 s=${s} a=${a}`);
        return s + a;
      }, 1);
      const [value2, dispatch2] = useReducer((a: number, b: number) => {
        log(`r2 a=${a} b=${b} value=${value}`);
        return a + b * value;
      }, 0);
      log(`render v=${value} v2=${value2}`);
      return { dispatch, dispatch2 };
    },
    drive: async ({ api, act }) => {
      await act(() => api().dispatch2(10));
      await act(() => {
        api().dispatch(1);
        api().dispatch2(10);
      });
      await act(() => {
        api().dispatch2(1);
        api().dispatch(5);
        api().dispatch2(2);
      });
    },
  },
  {
    name: "reducer closing over useState value updated in the same batch",
    use: (log) => {
      const [mode, setMode] = useState(1);
      const [total, add] = useReducer((s: number, n: number) => {
        log(`reducer s=${s} n=${n} mode=${mode}`);
        return s + n * mode;
      }, 0);
      log(`render mode=${mode} total=${total}`);
      return { setMode, add };
    },
    drive: async ({ api, act }) => {
      await act(() => {
        api().add(10);
        api().setMode(100);
        api().add(10);
      });
      await act(() => api().add(1));
    },
  },
  {
    name: "same reducer dispatched three times in one batch",
    use: (log) => {
      const [state, dispatch] = useReducer((s: number, a: number) => {
        log(`reducer s=${s} a=${a}`);
        return s * 2 + a;
      }, 1);
      log(`render ${state}`);
      return { dispatch };
    },
    drive: async ({ api, act }) => {
      await act(() => {
        api().dispatch(1);
        api().dispatch(2);
        api().dispatch(3);
      });
    },
  },
  {
    name: "mixed eager setState and lazy useReducer dispatch ordering",
    use: (log) => {
      const [a, setA] = useState(0);
      const [b, dispatchB] = useReducer((s: number, n: number) => {
        log(`reducerB s=${s} n=${n}`);
        return s + n;
      }, 0);
      log(`render a=${a} b=${b}`);
      return {
        run: () => {
          setA((prev) => {
            log(`updaterA prev=${prev}`);
            return prev + 1;
          });
          dispatchB(10);
          setA((prev) => {
            log(`updaterA2 prev=${prev}`);
            return prev + 1;
          });
        },
      };
    },
    drive: async ({ api, act }) => {
      await act(() => api().run());
    },
  },
  {
    name: "render-phase updates chain until they settle",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      if (count < 3) setCount(count + 1);
    },
  },
  {
    name: "render-phase updater chain with a guard converges",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      if (count < 5) {
        setCount((c) => c + 1);
      }
    },
  },
  {
    name: "render-phase updater functions apply in order",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      if (count === 0) {
        setCount((c) => {
          log(`updater1 c=${c}`);
          return c + 1;
        });
        setCount((c) => {
          log(`updater2 c=${c}`);
          return c + 10;
        });
      }
    },
  },
  {
    name: "render-phase setState to the same value runs one extra pass",
    use: (log) => {
      const [count, setCount] = useState(0);
      const dispatched = useRef(false);
      log(`render ${count}`);
      if (!dispatched.current) {
        dispatched.current = true;
        setCount(0);
      }
    },
  },
  {
    name: "render-phase adjustment derives one state from another across updates",
    use: (log) => {
      const [n, setN] = useState(0);
      const [doubled, setDoubled] = useState(0);
      log(`render n=${n} doubled=${doubled}`);
      if (doubled !== n * 2) setDoubled(n * 2);
      return { bump: () => setN((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bump());
      await act(() => api().bump());
    },
  },
  {
    name: "render-phase dispatch to a useReducer during render",
    use: (log) => {
      const [count, dispatch] = useReducer((s: number, a: number) => {
        log(`reducer s=${s} a=${a}`);
        return s + a;
      }, 0);
      log(`render ${count}`);
      if (count === 0) dispatch(5);
    },
  },
  {
    name: "setState inside a useMemo body is a render-phase update",
    use: (log) => {
      const [count, setCount] = useState(0);
      useMemo(() => {
        if (count === 0) setCount(1);
        return null;
      }, [count]);
      log(`render ${count}`);
    },
  },
  {
    name: "bail-then-revert in one batch forces a render with the same state",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      return {
        bounce: () => {
          setCount(1);
          setCount(0);
        },
      };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bounce());
      await act(() => api().bounce());
    },
  },
  {
    name: "NaN and negative zero: Object.is semantics for bailout",
    use: (log) => {
      const [value, setValue] = useState<number>(0);
      log(`render ${Number.isNaN(value) ? "NaN" : value}`);
      return { set: (n: number) => setValue(n) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().set(NaN));
      await act(() => api().set(-0));
      await act(() => api().set(0));
    },
  },
  {
    name: "NaN in deps: memo and effect do not refire",
    use: (log) => {
      const [, force] = useReducer((c: number) => c + 1, 0);
      const dep = NaN;
      useMemo(() => {
        log("memo");
        return null;
      }, [dep]);
      useEffect(() => {
        log("effect");
      }, [dep]);
      log("render");
      return { force };
    },
    drive: async ({ api, act }) => {
      await act(() => api().force());
    },
  },
  {
    name: "setState/dispatch function identity is stable across renders",
    use: (log) => {
      const [count, setCount] = useState(0);
      const [, dispatch] = useReducer((s: number) => s + 1, 0);
      const firstSet = useRef(setCount);
      const firstDispatch = useRef(dispatch);
      log(
        `render ${count} set-stable=${firstSet.current === setCount} dispatch-stable=${firstDispatch.current === dispatch}`,
      );
      return { inc: () => setCount((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().inc());
    },
  },
  {
    name: "ref mutation during render observes strict double-render",
    use: (log) => {
      const renders = useRef(0);
      renders.current++;
      const [count, setCount] = useState(0);
      log(`render count=${count} renders=${renders.current}`);
      return { inc: () => setCount((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().inc());
    },
  },
  {
    name: "two dispatches in separate microtasks batch into one render",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      return { inc: () => setCount((c) => c + 1) };
    },
    drive: async ({ api, settle }) => {
      api().inc();
      await Promise.resolve();
      api().inc();
      await settle();
    },
  },
  {
    name: "two dispatches in separate macrotasks render separately",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      return { inc: () => setCount((c) => c + 1) };
    },
    drive: async ({ api, settle }) => {
      api().inc();
      await new Promise((r) => setTimeout(r, 10));
      api().inc();
      await settle();
    },
  },
  {
    name: "update render: cleanup/setup ordering across two effects",
    use: (log) => {
      const [n, setN] = useState(0);
      useEffect(() => {
        log(`setup-1 n=${n}`);
        return () => log(`cleanup-1 n=${n}`);
      }, [n]);
      useEffect(() => {
        log(`setup-2 n=${n}`);
        return () => log(`cleanup-2 n=${n}`);
      }, [n]);
      return { bump: () => setN((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bump());
    },
  },
  {
    name: "effect deps array grows between renders",
    use: (log) => {
      const [n, setN] = useState(0);
      const deps = n === 0 ? [1] : [1, 2];
      useEffect(() => {
        log(`effect n=${n}`);
        return () => log(`cleanup n=${n}`);
      }, deps);
      log(`render ${n}`);
      return { bump: () => setN((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bump());
    },
  },
  {
    name: "dispatch from an effect cleanup on deps change",
    use: (log) => {
      const [n, setN] = useState(0);
      const [extra, bumpExtra] = useReducer((c: number) => c + 1, 0);
      log(`render n=${n} extra=${extra}`);
      useEffect(() => {
        log(`setup n=${n}`);
        return () => {
          log(`cleanup n=${n}`);
          bumpExtra();
        };
      }, [n]);
      return { bump: () => setN((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bump());
    },
  },
  {
    name: "cascading updates: effect chain until fixpoint",
    use: (log) => {
      const [n, setN] = useState(0);
      log(`render ${n}`);
      useEffect(() => {
        log(`effect ${n}`);
        if (n < 3) setN(n + 1);
      }, [n]);
    },
    drive: ({ settle }) => settle(),
  },
  {
    name: "memo depending on reducer state recomputes exactly once per change",
    use: (log) => {
      const [n, dispatch] = useReducer((s: number, a: number) => s + a, 0);
      const doubled = useMemo(() => {
        log(`memo n=${n}`);
        return n * 2;
      }, [n]);
      log(`render n=${n} doubled=${doubled}`);
      return { dispatch };
    },
    drive: async ({ api, act }) => {
      await act(() => api().dispatch(1));
      await act(() => api().dispatch(0));
    },
  },
];

describeParity(scenarios);
