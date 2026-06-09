import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  getCommittedOutput,
  waitForNextTick,
} from "../test-utils";
import { useState, useEffect } from "../../react-shim";

describe("@assistant-ui/tap/react-shim", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  describe("inside a tap resource", () => {
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
      expect(getCommittedOutput(testFiber)).toBe(0);
      expect(effectLog).toEqual([0]);

      setCount!(5);
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(5);
      expect(effectLog).toEqual([0, 5]);
    });
  });

  describe("inside a React component", () => {
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
  });
});
