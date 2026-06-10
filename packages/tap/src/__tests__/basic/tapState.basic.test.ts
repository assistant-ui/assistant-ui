import { describe, it, expect, afterEach } from "vitest";
import { useState } from "../../react-hooks/useState";
import { useEffect } from "../../react-hooks/useEffect";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  waitForNextTick,
  getCommittedOutput,
} from "../test-utils";

describe("useState - Basic Functionality", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  describe("Initialization", () => {
    it("should initialize with direct value", () => {
      const testFiber = createTestResource(() => {
        const [count] = useState(42);
        return count;
      });

      const result = renderTest(testFiber);
      expect(result).toBe(42);
    });

    it("should initialize with lazy value function", () => {
      let initCalled = 0;

      const testFiber = createTestResource(() => {
        const [count] = useState(() => {
          initCalled++;
          return 100;
        });
        return count;
      });

      // First render
      const result = renderTest(testFiber);
      expect(result).toBe(100);
      expect(initCalled).toBe(1);

      // Re-render should not call initializer again
      renderTest(testFiber);
      expect(initCalled).toBe(1);
    });

    it("should handle undefined initial state", () => {
      const testFiber = createTestResource(() => {
        const [value] = useState<string>();
        return value;
      });

      const result = renderTest(testFiber);
      expect(result).toBeUndefined();
    });
  });

  describe("State Updates", () => {
    it("should update state and trigger re-render", async () => {
      let renderCount = 0;
      let setCountFn: ((value: number) => void) | null = null;

      const testFiber = createTestResource(() => {
        renderCount++;
        const [count, setCount] = useState(0);

        // Capture setter on first render
        if (!setCountFn) {
          setCountFn = setCount;
        }

        return { count, renderCount };
      });

      // Initial render
      const result1 = renderTest(testFiber);
      expect(result1).toEqual({ count: 0, renderCount: 1 });

      // Update state
      setCountFn!(10);

      // Wait for re-render
      await waitForNextTick();

      // Check that state was updated
      expect(getCommittedOutput(testFiber)).toEqual({
        count: 10,
        renderCount: 2,
      });
    });

    it("should not re-render for same value (Object.is comparison)", async () => {
      let renderCount = 0;
      let setCountFn: ((value: number) => void) | null = null;

      const testFiber = createTestResource(() => {
        renderCount++;
        const [count, setCount] = useState(42);

        useEffect(() => {
          setCountFn = setCount;
        });

        return { count, renderCount };
      });

      // Initial render
      renderTest(testFiber);
      expect(renderCount).toBe(1);

      // Set same value
      setCountFn!(42);

      // Wait to ensure no re-render happens
      await waitForNextTick();

      // Should not trigger re-render
      expect(renderCount).toBe(1);
    });

    it("should handle functional updates", async () => {
      let setCountFn: ((updater: (prev: number) => number) => void) | null =
        null;

      const testFiber = createTestResource(() => {
        const [count, setCount] = useState(10);

        useEffect(() => {
          setCountFn = setCount;
        });

        return count;
      });

      // Initial render
      renderTest(testFiber);
      expect(getCommittedOutput(testFiber)).toBe(10);

      // Functional update
      setCountFn!((prev) => prev * 2);

      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(20);

      // Another functional update
      setCountFn!((prev) => prev + 5);

      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(25);
    });
  });

  describe("Multiple States", () => {
    it("should handle multiple state hooks independently", () => {
      const testFiber = createTestResource(() => {
        const [count1, setCount1] = useState(1);
        const [count2, setCount2] = useState(2);
        const [text, setText] = useState("hello");

        return {
          count1,
          count2,
          text,
          setters: { setCount1, setCount2, setText },
        };
      });

      const result = renderTest(testFiber);
      expect(result).toMatchObject({
        count1: 1,
        count2: 2,
        text: "hello",
      });
    });

    it("should update multiple states independently", async () => {
      let setters: any = null;

      const testFiber = createTestResource(() => {
        const [a, setA] = useState("a");
        const [b, setB] = useState("b");
        const [c, setC] = useState("c");

        useEffect(() => {
          setters = { setA, setB, setC };
        });

        return { a, b, c };
      });

      // Initial render
      renderTest(testFiber);
      expect(getCommittedOutput(testFiber)).toEqual({ a: "a", b: "b", c: "c" });

      // Update only B
      setters.setB("B");
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toEqual({ a: "a", b: "B", c: "c" });

      // Update A and C
      setters.setA("A");
      setters.setC("C");
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toEqual({ a: "A", b: "B", c: "C" });
    });
  });

  describe("State Persistence", () => {
    it("should persist state across prop changes", async () => {
      let setCountFn: ((value: number) => void) | null = null;

      const testFiber = createTestResource((props: { multiplier: number }) => {
        const [count, setCount] = useState(10);

        useEffect(() => {
          setCountFn = setCount;
        });

        return {
          count,
          multiplied: count * props.multiplier,
        };
      });

      // Initial render
      const result1 = renderTest(testFiber, { multiplier: 2 });
      expect(result1).toEqual({ count: 10, multiplied: 20 });

      // Update state
      setCountFn!(15);
      await waitForNextTick();

      // Re-render with different props
      const result2 = renderTest(testFiber, { multiplier: 3 });
      expect(result2).toEqual({ count: 15, multiplied: 45 });
    });
  });
});
