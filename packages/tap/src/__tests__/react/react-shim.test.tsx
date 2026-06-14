import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  getCommittedValue,
  waitForNextTick,
} from "../test-utils";
import {
  createContext,
  use,
  useContext,
  useState,
  useEffect,
} from "../../react-shim";
import { useContextProvider } from "../../core/context";
import { renderResourceFiber } from "../../core/ResourceFiber";
import { use as tapUse } from "../../react-hooks/use";
import { c as _c } from "../../react-shim/compiler-runtime";

const SENTINEL = Symbol.for("react.memo_cache_sentinel");

describe("@assistant-ui/tap/react-shim", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupAllResources();
    cleanup();
  });

  describe("inside a tap resource", () => {
    it("uses shim-created React contexts as tap contexts", () => {
      const TestContext = createContext("default");

      const defaultFiber = createTestResource(() => useContext(TestContext));
      const providedFiber = createTestResource((value: string) => {
        return useContextProvider(TestContext, value, () =>
          useContext(TestContext),
        );
      });

      expect(renderTest(defaultFiber)).toBe("default");
      expect(renderTest(providedFiber, "tap")).toBe("tap");
    });

    it("registers provided React contexts created outside the shim", () => {
      const TestContext = React.createContext("default");
      const defaultFiber = createTestResource(() => use(TestContext));
      const testFiber = createTestResource((value: string) => {
        return useContextProvider(TestContext, value, () => use(TestContext));
      });

      expect(renderTest(defaultFiber)).toBe("default");
      expect(renderTest(testFiber, "tap")).toBe("tap");

      const ProviderFirstContext = React.createContext("default");
      const providerFirstFiber = createTestResource((value: string) => {
        return useContextProvider(ProviderFirstContext, value, () =>
          use(ProviderFirstContext),
        );
      });
      const providerFirstDefaultFiber = createTestResource(() =>
        use(ProviderFirstContext),
      );

      expect(renderTest(providerFirstFiber, "tap")).toBe("tap");
      expect(renderTest(providerFirstDefaultFiber)).toBe("default");
    });

    it("forwards non-context use values to React.use", () => {
      const promise = Promise.resolve("react");
      const useSpy = vi
        .spyOn(React, "use")
        .mockImplementation(() => "react-use");
      const testFiber = createTestResource(() => use(promise));

      expect(renderTest(testFiber)).toBe("react-use");
      expect(useSpy).toHaveBeenCalledWith(promise);

      useSpy.mockRestore();
    });

    it("rejects non-context values in tap's direct use hook", () => {
      const testFiber = createTestResource(() => tapUse(Promise.resolve()));

      expect(() => renderResourceFiber(testFiber, [])).toThrow(
        "A tap resource's `use()` only accepts a tap context.",
      );
    });

    it("useState routes to useState and useEffect to useEffect", async () => {
      let setCount: ((n: number) => void) | null = null;
      const effectLog: number[] = [];

      const testFiber = createTestResource(() => {
        const [count, set] = useState(0);
        useEffect(() => {
          setCount = set;
          effectLog.push(count);
        }, [count]);
        return count;
      });

      renderTest(testFiber);
      expect(getCommittedValue(testFiber)).toBe(0);
      expect(effectLog).toEqual([0]);

      setCount!(5);
      await waitForNextTick();
      expect(getCommittedValue(testFiber)).toBe(5);
      expect(effectLog).toEqual([0, 5]);
    });

    it("c() persists the memo cache across renders", () => {
      let computes = 0;
      const testFiber = createTestResource((p: { x: number }) => {
        // exactly what React Compiler emits: const $ = _c(n)
        const $ = _c(2);
        let double;
        if ($[0] !== p.x) {
          computes++;
          double = p.x * 2;
          $[0] = p.x;
          $[1] = double;
        } else {
          double = $[1];
        }
        return double;
      });

      expect(renderTest(testFiber, { x: 2 })).toBe(4);
      expect(computes).toBe(1);
      expect(renderTest(testFiber, { x: 2 })).toBe(4);
      expect(computes).toBe(1);
      expect(renderTest(testFiber, { x: 3 })).toBe(6);
      expect(computes).toBe(2);
    });
  });

  describe("inside a React component", () => {
    it("uses shim-created contexts as regular React contexts", () => {
      const TestContext = createContext("default");

      function App({ value }: { value?: string }) {
        const text = useContext(TestContext);
        if (value === undefined) return <div data-testid="out">{text}</div>;

        return (
          <TestContext.Provider value={value}>
            <Child />
          </TestContext.Provider>
        );
      }

      function Child() {
        return <div data-testid="out">{useContext(TestContext)}</div>;
      }

      const { rerender } = render(<App />);
      expect(screen.getByTestId("out").textContent).toBe("default");

      rerender(<App value="react" />);
      expect(screen.getByTestId("out").textContent).toBe("react");
    });

    it("useState routes to React.useState", () => {
      function Counter() {
        const [count, setCount] = useState(0);
        return (
          <button
            type="button"
            data-testid="btn"
            onClick={() => setCount(count + 1)}
          >
            {count}
          </button>
        );
      }

      render(<Counter />);
      const btn = screen.getByTestId("btn");
      expect(btn.textContent).toBe("0");
      act(() => btn.click());
      expect(btn.textContent).toBe("1");
    });

    it("c() routes to React's compiler runtime", () => {
      let computes = 0;
      function Compiled({ x }: { x: number }) {
        const $ = _c(2);
        let double;
        if ($[0] === SENTINEL || $[0] !== x) {
          computes++;
          double = x * 2;
          $[0] = x;
          $[1] = double;
        } else {
          double = $[1];
        }
        return <div data-testid="out">{double as number}</div>;
      }

      const { rerender } = render(<Compiled x={2} />);
      expect(screen.getByTestId("out").textContent).toBe("4");
      expect(computes).toBe(1);
      rerender(<Compiled x={2} />);
      expect(computes).toBe(1);
      rerender(<Compiled x={3} />);
      expect(screen.getByTestId("out").textContent).toBe("6");
      expect(computes).toBe(2);
    });
  });
});
