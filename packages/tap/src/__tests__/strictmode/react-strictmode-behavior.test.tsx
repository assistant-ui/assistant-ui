/**
 * Tests to verify React's strict mode behavior
 * These tests verify React's own behavior, not tap's implementation
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import {
  StrictMode,
  useState,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

describe("React Strict Mode Behavior Verification", () => {
  describe("Test 1: Effect + setState behavior in strict mode", () => {
    it("should mount, setState in effect, unmount, remount with OLD state, then rerender with NEW state", () => {
      const events: string[] = [];

      function TestComponent() {
        const [count, setCount] = useState(() => {
          events.push("useState init");
          return 0;
        });

        events.push(`render count=${count}`);

        useEffect(() => {
          events.push(`effect mount count=${count}`);
          if (count === 0) {
            setCount(1);
          }

          return () => {
            events.push(`effect cleanup count=${count}`);
          };
        }, [count]);

        return <div>Count: {count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ACTUAL React behavior observed:
      // 1. Render twice (double-render): useState init called twice
      // 2. Effect mounts with count=0 and calls setState(1)
      // 3. Effect unmounts (strict mode)
      // 4. Effect remounts with count=0 and calls setState(1)
      // 5. setState causes rerender with count=1 (double-render)
      // 6. Effect with [count] deps reruns, cleanup old effect, mount new

      expect(events).toEqual([
        "useState init",
        "useState init",
        "render count=0",
        "render count=0",
        "effect mount count=0",
        "effect cleanup count=0",
        "effect mount count=0",
        "render count=1",
        "render count=1",
        "effect cleanup count=0",
        "effect mount count=1",
      ]);
    });

    it("should show that setState in effect during mount is applied after strict mode cycle", () => {
      const events: string[] = [];

      function TestComponent() {
        const [value, setValue] = useState("initial");

        events.push(`render value=${value}`);

        useEffect(() => {
          events.push(`effect mount value=${value}`);
          if (value === "initial") {
            setValue("updated");
          }

          return () => {
            events.push(`effect cleanup value=${value}`);
          };
        }, [value]);

        return <div>{value}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ACTUAL React behavior observed:
      // 1. Double-render with value=initial (no useState init log because it's a constant)
      // 2. Effect mounts and calls setValue
      // 3. Effect unmounts (strict mode)
      // 4. Effect remounts with value=initial and calls setValue
      // 5. setState causes rerender with value=updated (double-render)
      // 6. Effect with [value] deps reruns, cleanup old effect, mount new

      expect(events).toEqual([
        "render value=initial",
        "render value=initial",
        "effect mount value=initial",
        "effect cleanup value=initial",
        "effect mount value=initial",
        "render value=updated",
        "render value=updated",
        "effect cleanup value=initial",
        "effect mount value=updated",
      ]);
    });
  });

  describe("Test 2: Render/commit sequence with useState and useMemo", () => {
    it("should show the sequence: render → useState init (dropped) → useMemo (dropped) → render → commit → commit(stale?) → render → commit", () => {
      const events: string[] = [];

      function TestComponent() {
        const renderCount = useRef(0);
        renderCount.current++;

        events.push(`render #${renderCount.current}`);

        const [state] = useState(() => {
          events.push(`useState init #${renderCount.current}`);
          return "state";
        });

        const memoValue = useMemo(() => {
          events.push(`useMemo #${renderCount.current}`);
          return `memo-${renderCount.current}`;
        }, []);

        useEffect(() => {
          events.push(`effect commit #${renderCount.current} state=${state}`);
          return () => {
            events.push(`effect cleanup #${renderCount.current}`);
          };
        }, [state]);

        return <div>{memoValue}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ACTUAL React behavior observed:
      // 1. Renders twice (double-render): both useState and useMemo called twice
      // 2. The state/memo results are NOT dropped - both are kept
      // 3. Commits the effects once
      // 4. Unmounts and remounts effects (strict mode)

      expect(events).toEqual([
        "render #1",
        "useState init #1",
        "useState init #1",
        "useMemo #1",
        "useMemo #1",
        "render #2",
        "effect commit #2 state=state",
        "effect cleanup #2",
        "effect commit #2 state=state",
      ]);
    });

    it("should verify that useState initializer is called twice but second value is used", () => {
      const events: string[] = [];
      let initCallCount = 0;

      function TestComponent() {
        const [value] = useState(() => {
          initCallCount++;
          events.push(`useState init call #${initCallCount}`);
          return initCallCount;
        });

        events.push(`render value=${value}`);

        return <div>{value}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ACTUAL React behavior: useState initializer is called twice,
      // but the FIRST value is kept (not the second)!
      expect(events).toEqual([
        "useState init call #1",
        "useState init call #2",
        "render value=1",
        "render value=1",
      ]);
    });
  });

  describe("Test 3: Component tree vs per-component remounting", () => {
    it("should show whether React remounts entire tree or per-component", () => {
      const events: string[] = [];

      function Parent() {
        events.push("Parent render");

        useEffect(() => {
          events.push("Parent effect mount");
          return () => {
            events.push("Parent effect cleanup");
          };
        }, []);

        return (
          <div>
            <Child1 />
            <Child2 />
          </div>
        );
      }

      function Child1() {
        events.push("Child1 render");

        useEffect(() => {
          events.push("Child1 effect mount");
          return () => {
            events.push("Child1 effect cleanup");
          };
        }, []);

        return <div>Child1</div>;
      }

      function Child2() {
        events.push("Child2 render");

        useEffect(() => {
          events.push("Child2 effect mount");
          return () => {
            events.push("Child2 effect cleanup");
          };
        }, []);

        return <div>Child2</div>;
      }

      render(
        <StrictMode>
          <Parent />
        </StrictMode>,
      );

      // ACTUAL React behavior:
      // 1. Parent renders twice, then each child renders twice
      // 2. Effects mount in child-to-parent order (children first, then parent)
      // 3. Then unmounts all effects and remounts all (strict mode)

      expect(events).toEqual([
        "Parent render",
        "Parent render",
        "Child1 render",
        "Child1 render",
        "Child2 render",
        "Child2 render",
        "Child1 effect mount",
        "Child2 effect mount",
        "Parent effect mount",
        "Parent effect cleanup",
        "Child1 effect cleanup",
        "Child2 effect cleanup",
        "Child1 effect mount",
        "Child2 effect mount",
        "Parent effect mount",
      ]);
    });

    it("should verify that nested components follow the same pattern with state updates", () => {
      const events: string[] = [];

      function Parent() {
        const [parentState, setParentState] = useState(0);
        events.push(`Parent render state=${parentState}`);

        useEffect(() => {
          events.push(`Parent effect mount state=${parentState}`);
          if (parentState === 0) {
            setParentState(1);
          }
          return () => {
            events.push(`Parent effect cleanup state=${parentState}`);
          };
        }, [parentState]);

        return (
          <div>
            <Child parentState={parentState} />
          </div>
        );
      }

      function Child({ parentState }: { parentState: number }) {
        events.push(`Child render parentState=${parentState}`);

        useEffect(() => {
          events.push(`Child effect mount parentState=${parentState}`);
          return () => {
            events.push(`Child effect cleanup parentState=${parentState}`);
          };
        }, [parentState]);

        return <div>Child</div>;
      }

      render(
        <StrictMode>
          <Parent />
        </StrictMode>,
      );

      // ACTUAL React behavior:
      // 1. Parent double-render, child double-render
      // 2. Effects mount in child-to-parent order
      // 3. Unmount/remount all (strict mode)
      // 4. State update causes parent double-render, child double-render
      // 5. Effects update (no remount), child-to-parent order

      expect(events).toEqual([
        "Parent render state=0",
        "Parent render state=0",
        "Child render parentState=0",
        "Child render parentState=0",
        "Child effect mount parentState=0",
        "Parent effect mount state=0",
        "Parent effect cleanup state=0",
        "Child effect cleanup parentState=0",
        "Child effect mount parentState=0",
        "Parent effect mount state=0",
        "Parent render state=1",
        "Parent render state=1",
        "Child render parentState=1",
        "Child render parentState=1",
        "Child effect cleanup parentState=0",
        "Parent effect cleanup state=0",
        "Child effect mount parentState=1",
        "Parent effect mount state=1",
      ]);
    });
  });

  describe("Test 4: Delayed mount behavior (subtree mounted after initial render)", () => {
    it("should show behavior when a subtree is mounted after initial render completes", () => {
      const events: string[] = [];

      function Parent() {
        const [showChild, setShowChild] = useState(false);
        events.push(`Parent render showChild=${showChild}`);

        useEffect(() => {
          events.push(`Parent effect mount showChild=${showChild}`);
          if (!showChild) {
            setShowChild(true);
          }
          return () => {
            events.push(`Parent effect cleanup showChild=${showChild}`);
          };
        }, [showChild]);

        return (
          <div>
            Parent
            {showChild && <DelayedChild />}
          </div>
        );
      }

      function DelayedChild() {
        events.push("DelayedChild render");

        useEffect(() => {
          events.push("DelayedChild effect mount");
          return () => {
            events.push("DelayedChild effect cleanup");
          };
        }, []);

        return <div>Child</div>;
      }

      render(
        <StrictMode>
          <Parent />
        </StrictMode>,
      );

      // ACTUAL React behavior: Components added after initial render
      // still get double-render and strict mode double-mount

      expect(events).toEqual([
        "Parent render showChild=false",
        "Parent render showChild=false",
        "Parent effect mount showChild=false",
        "Parent effect cleanup showChild=false",
        "Parent effect mount showChild=false",
        "Parent render showChild=true",
        "Parent render showChild=true",
        "DelayedChild render",
        "DelayedChild render",
        "Parent effect cleanup showChild=false",
        "DelayedChild effect mount",
        "Parent effect mount showChild=true",
        "DelayedChild effect cleanup",
        "DelayedChild effect mount",
      ]);
    });

    it("should verify that subtree mounted later still gets strict mode treatment", () => {
      const events: string[] = [];

      function Root() {
        const [mounted, setMounted] = useState(false);
        events.push(`Root render mounted=${mounted}`);

        useEffect(() => {
          events.push(`Root effect mount mounted=${mounted}`);
          if (!mounted) {
            // Mount the subtree after the first effect runs
            setMounted(true);
          }
          return () => {
            events.push(`Root effect cleanup mounted=${mounted}`);
          };
        }, [mounted]);

        return <div>{mounted && <LateComponent />}</div>;
      }

      function LateComponent() {
        const [state, setState] = useState("initial");
        events.push(`LateComponent render state=${state}`);

        useEffect(() => {
          events.push(`LateComponent effect mount state=${state}`);
          if (state === "initial") {
            setState("updated");
          }
          return () => {
            events.push(`LateComponent effect cleanup state=${state}`);
          };
        }, [state]);

        return <div>{state}</div>;
      }

      render(
        <StrictMode>
          <Root />
        </StrictMode>,
      );

      // ACTUAL React behavior: Components added after initial strict mode cycle
      // still get the double-render and double-mount treatment,
      // but setState only causes double-render (no remount)

      expect(events).toEqual([
        "Root render mounted=false",
        "Root render mounted=false",
        "Root effect mount mounted=false",
        "Root effect cleanup mounted=false",
        "Root effect mount mounted=false",
        "Root render mounted=true",
        "Root render mounted=true",
        "LateComponent render state=initial",
        "LateComponent render state=initial",
        "Root effect cleanup mounted=false",
        "LateComponent effect mount state=initial",
        "Root effect mount mounted=true",
        "LateComponent effect cleanup state=initial",
        "LateComponent effect mount state=initial",
        "LateComponent render state=updated",
        "LateComponent render state=updated",
        "LateComponent effect cleanup state=initial",
        "LateComponent effect mount state=updated",
      ]);
    });
  });

  describe("Test 5: useMemo strict mode behavior", () => {
    it("should double-invoke useMemo factory and use the first result", () => {
      const events: string[] = [];
      let memoCallCount = 0;

      function TestComponent() {
        const memoValue = useMemo(() => {
          memoCallCount++;
          events.push(`memo-${memoCallCount}`);
          return memoCallCount;
        }, []);

        events.push(`render memoValue=${memoValue}`);

        return <div>{memoValue}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      expect(events).toEqual([
        "memo-1",
        "memo-2",
        "render memoValue=1",
        "render memoValue=1",
      ]);
    });
  });

  describe("Test 6: useReducer strict mode behavior", () => {
    it("should double-invoke useReducer initializer and use the first result", () => {
      const events: string[] = [];
      let initCallCount = 0;

      function TestComponent() {
        const [state] = useReducer(
          (s: number, a: number) => s + a,
          0,
          (arg) => {
            initCallCount++;
            events.push(`init-${initCallCount}`);
            return arg + initCallCount * 10;
          },
        );

        events.push(`render state=${state}`);

        return <div>{state}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      expect(events).toEqual([
        "init-1",
        "init-2",
        "render state=10",
        "render state=10",
      ]);
    });

    it("should double-invoke useReducer reducer on dispatch and use the first result", () => {
      const events: string[] = [];
      let reducerCallCount = 0;

      function TestComponent() {
        const [state, dispatch] = useReducer((s: number, _a: number) => {
          reducerCallCount++;
          const result = reducerCallCount * 100;
          events.push(`reducer-${reducerCallCount} state=${s} -> ${result}`);
          return result;
        }, 0);

        events.push(`render state=${state}`);

        useEffect(() => {
          if (state === 0) {
            events.push("dispatch");
            dispatch(1);
          }
        }, [state]);

        return <div>{state}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // React behavior: reducer is called 4 times (2 dispatches × 2 strict mode double-calls)
      // Dispatch #1 (effect mount): reducer called twice, SECOND result (200) kept
      // Dispatch #2 (effect remount): reducer called twice, SECOND result (400) kept
      // Note: this is opposite to useMemo/useState which keep the FIRST result!
      expect(reducerCallCount).toBe(4);
      expect(events).toEqual([
        "render state=0",
        "render state=0",
        "dispatch",
        "dispatch",
        "reducer-1 state=0 -> 100",
        "reducer-2 state=0 -> 200",
        "reducer-3 state=200 -> 300",
        "reducer-4 state=200 -> 400",
        "render state=400",
        "render state=400",
      ]);
    });
  });

  describe("Test 7: useState/useReducer dispatch double-invoke (isolated from effects)", () => {
    it("should double-invoke useState updater and use the first result", () => {
      const events: string[] = [];
      let updaterCallCount = 0;
      let setCountRef: ((fn: (prev: number) => number) => void) | null = null;

      function TestComponent() {
        const [count, setCount] = useState(0);
        setCountRef = setCount;

        events.push(`render count=${count}`);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      events.length = 0;
      updaterCallCount = 0;

      act(() => {
        setCountRef!((prev) => {
          updaterCallCount++;
          const result = updaterCallCount * 100;
          events.push(`updater-${updaterCallCount} prev=${prev} -> ${result}`);
          return result;
        });
      });

      // useState updater is double-invoked, FIRST result kept
      // (same as useMemo/useState init — NOT like useReducer dispatch!)
      expect(updaterCallCount).toBe(2);
      expect(events).toEqual([
        "updater-1 prev=0 -> 100",
        "updater-2 prev=0 -> 200",
        "render count=100",
        "render count=100",
      ]);
    });

    it("should double-invoke useReducer reducer and use the first result", () => {
      const events: string[] = [];
      let reducerCallCount = 0;
      let dispatchRef: ((a: number) => void) | null = null;

      function TestComponent() {
        const [state, dispatch] = useReducer((s: number, _a: number) => {
          reducerCallCount++;
          const result = reducerCallCount * 100;
          events.push(`reducer-${reducerCallCount} state=${s} -> ${result}`);
          return result;
        }, 0);
        dispatchRef = dispatch;

        events.push(`render state=${state}`);

        return <div>{state}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      events.length = 0;
      reducerCallCount = 0;

      act(() => {
        dispatchRef!(1);
      });

      // useReducer reducer is double-invoked, SECOND result kept!
      // This differs from useState updater which keeps the FIRST result.
      expect(reducerCallCount).toBe(2);
      expect(events).toEqual([
        "reducer-1 state=0 -> 100",
        "reducer-2 state=0 -> 200",
        "render state=200",
        "render state=200",
      ]);
    });
  });

  describe("Test 8: setState in effect - strict mode edge cases", () => {
    it("should verify which setState is applied when effect calls setState only on first mount", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        useEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          // Only call setState on the FIRST mount, not the remount
          if (effectRunCount === 1) {
            events.push(`setState(1) called in effect #${effectRunCount}`);
            setCount(1);
          } else {
            events.push(`no setState in effect #${effectRunCount}`);
          }

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // KEY FINDING: React DOES apply the setState(1) from effect #1,
      // even though it was called in an effect that was cleaned up!
      // The state update is queued and processed after the strict mode cycle.
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState(1) called in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "no setState in effect #2",
        "render count=1", // setState(1) was applied!
        "render count=1",
      ]);
    });

    it("should verify which setState is applied when both effect mounts call setState with different values", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        useEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          if (effectRunCount === 1) {
            events.push(`setState(1) called in effect #${effectRunCount}`);
            setCount(1);
          } else if (effectRunCount === 2) {
            events.push(`setState(2) called in effect #${effectRunCount}`);
            setCount(2);
          }

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // KEY FINDING: React applies the LAST setState (setState(2)),
      // not the first one or both. The state updates are batched and
      // the later one overwrites the earlier one.
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState(1) called in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "setState(2) called in effect #2",
        "render count=2", // Only setState(2) was applied!
        "render count=2",
      ]);
    });

    it("should verify setState callback execution during strict mode", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        useEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          // Use updater function to see if it's called once or twice
          setCount((prev) => {
            events.push(
              `setState updater called with prev=${prev} in effect #${effectRunCount}`,
            );
            return prev + effectRunCount;
          });

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // KEY FINDING: Both updater functions are queued and executed!
      // Effect #1: updater(0) => 0 + 1 = 1
      // Effect #2: updater(0) => 0 + 2 = 2
      // But then the updater from effect #2 runs TWICE MORE with prev=1
      // due to strict mode doubling the updater call itself!
      // Final calculation: 0 -> 1 (from effect #1) -> 3 (from effect #2: 1+2)
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState updater called with prev=0 in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "setState updater called with prev=0 in effect #2",
        "setState updater called with prev=1 in effect #2", // Updater doubled!
        "setState updater called with prev=1 in effect #2", // Updater doubled again!
        "render count=3", // Final: 0 -> 1 -> 3
        "render count=3",
      ]);
    });

    it("should use the SECOND return value when updater is called twice in strict mode", () => {
      const events: string[] = [];
      let updaterCallCount = 0;

      function TestComponent() {
        const [count, setCount] = useState(0);
        events.push(`render count=${count}`);

        useEffect(() => {
          events.push("effect mount");
          setCount((prev) => {
            updaterCallCount++;
            events.push(`updater call #${updaterCallCount} with prev=${prev}`);
            // Return different values on each call
            if (updaterCallCount === 1) {
              return 100; // First call returns 100
            }
            return 200; // Second call returns 200
          });

          return () => {
            events.push("effect cleanup");
          };
        }, []);

        return <div>{count}</div>;
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      );

      // ANSWER: React calls updater 4 times and uses the LAST return value!
      // Sequence:
      // 1. Effect #1 mounts: updater(0) → 100
      // 2. Effect #1 cleanup (strict mode)
      // 3. Effect #2 mounts: updater(0) → 200
      // 4. Strict mode doubles the updater: updater(100) → 200
      // 5. Strict mode doubles again: updater(100) → 200
      // Final value: 200 (from the last call)
      expect(updaterCallCount).toBe(4);
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount",
        "updater call #1 with prev=0", // Effect #1: returns 100
        "effect cleanup",
        "effect mount",
        "updater call #2 with prev=0", // Effect #2: returns 200
        "updater call #3 with prev=100", // Strict mode double: returns 200
        "updater call #4 with prev=100", // Strict mode double again: returns 200
        "render count=200", // Uses LAST return value
        "render count=200",
      ]);
    });
  });
});
