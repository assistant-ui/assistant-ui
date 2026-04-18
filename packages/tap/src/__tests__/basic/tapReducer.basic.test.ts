import { describe, it, expect, afterEach } from "vitest";
import { tapReducer } from "../../hooks/tap-reducer";
import { tapEffect } from "../../hooks/tap-effect";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  waitForNextTick,
  getCommittedOutput,
} from "../test-utils";

describe("tapReducer - Basic Functionality", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  describe("Initialization", () => {
    it("should initialize with direct value", () => {
      const reducer = (state: number, action: number) => state + action;

      const testFiber = createTestResource(() => {
        const [count] = tapReducer(reducer, 0);
        return count;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toBe(0);
    });

    it("should initialize with init function", () => {
      let initCalled = 0;
      const reducer = (state: number, action: number) => state + action;

      const testFiber = createTestResource(() => {
        const [count] = tapReducer(reducer, 10, (arg) => {
          initCalled++;
          return arg * 2;
        });
        return count;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toBe(20);
      expect(initCalled).toBe(1);

      // Re-render should not call init again
      renderTest(testFiber, undefined);
      expect(initCalled).toBe(1);
    });
  });

  describe("Dispatch and re-render", () => {
    it("should dispatch actions and trigger re-render", async () => {
      type Action = { type: "increment" } | { type: "decrement" };
      const reducer = (state: number, action: Action) => {
        switch (action.type) {
          case "increment":
            return state + 1;
          case "decrement":
            return state - 1;
        }
      };

      let dispatchFn: ((action: Action) => void) | null = null;

      const testFiber = createTestResource(() => {
        const [count, dispatch] = tapReducer(reducer, 0);

        tapEffect(() => {
          dispatchFn = dispatch;
        });

        return count;
      });

      renderTest(testFiber, undefined);
      expect(getCommittedOutput(testFiber)).toBe(0);

      dispatchFn!({ type: "increment" });
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(1);

      dispatchFn!({ type: "increment" });
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(2);

      dispatchFn!({ type: "decrement" });
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(1);
    });
  });

  describe("Same-state bailout", () => {
    it("should not re-render when reducer returns same state (Object.is)", async () => {
      let renderCount = 0;
      const reducer = (state: number, action: number) =>
        action === 0 ? state : state + action;

      let dispatchFn: ((action: number) => void) | null = null;

      const testFiber = createTestResource(() => {
        renderCount++;
        const [count, dispatch] = tapReducer(reducer, 42);

        tapEffect(() => {
          dispatchFn = dispatch;
        });

        return count;
      });

      renderTest(testFiber, undefined);
      expect(renderCount).toBe(1);

      // Dispatch action that returns same state
      dispatchFn!(0);
      await waitForNextTick();
      expect(renderCount).toBe(1);
    });
  });

  describe("Reducer function updates", () => {
    it("should use latest reducer reference", async () => {
      let multiplier = 1;
      let dispatchFn: ((action: number) => void) | null = null;

      const testFiber = createTestResource(() => {
        const reducer = (state: number, action: number) =>
          state + action * multiplier;
        const [count, dispatch] = tapReducer(reducer, 0);

        tapEffect(() => {
          dispatchFn = dispatch;
        });

        return count;
      });

      renderTest(testFiber, undefined);
      expect(getCommittedOutput(testFiber)).toBe(0);

      // Dispatch with multiplier=1
      dispatchFn!(5);
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(5);

      // Change multiplier and dispatch
      multiplier = 10;
      renderTest(testFiber, undefined); // re-render to update reducer
      dispatchFn!(5);
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(55); // 5 + 5*10
    });
  });

  describe("Multiple dispatches", () => {
    it("should handle multiple dispatches correctly", async () => {
      const reducer = (state: number, action: number) => state + action;
      let dispatchFn: ((action: number) => void) | null = null;

      const testFiber = createTestResource(() => {
        const [count, dispatch] = tapReducer(reducer, 0);

        tapEffect(() => {
          dispatchFn = dispatch;
        });

        return count;
      });

      renderTest(testFiber, undefined);
      expect(getCommittedOutput(testFiber)).toBe(0);

      // Multiple dispatches
      dispatchFn!(1);
      dispatchFn!(2);
      dispatchFn!(3);
      await waitForNextTick();
      expect(getCommittedOutput(testFiber)).toBe(6);
    });
  });

  describe("Dispatch identity stability", () => {
    it("should return same dispatch reference across renders", () => {
      const reducer = (state: number, action: number) => state + action;
      const dispatches: ((action: number) => void)[] = [];

      const testFiber = createTestResource(() => {
        const [count, dispatch] = tapReducer(reducer, 0);
        dispatches.push(dispatch);
        return count;
      });

      renderTest(testFiber, undefined);
      renderTest(testFiber, undefined);

      expect(dispatches[0]).toBe(dispatches[1]);
    });
  });
});
