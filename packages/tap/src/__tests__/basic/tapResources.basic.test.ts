import { describe, it, expect, afterEach } from "vitest";
import { useResources } from "../../hooks/useResources";
import {
  commitResourceFiber,
  discardWipRender,
  renderResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";
import { useState } from "../../react-hooks/useState";
import { useEffect } from "../../react-hooks/useEffect";
import { resource } from "../../core/resource";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { withKey } from "../../core/withKey";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  createCounterResource,
  getCommittedValue,
} from "../test-utils";

const SimpleCounter = resource(createCounterResource());

// Stateful counter that tracks its own count
const useStatefulCounter = (props: { initial: number }) => {
  const [count] = useState(props.initial);
  return { count };
};

const StatefulCounter = resource(useStatefulCounter);

// Display component for testing type changes
const useDisplay = (props: { text: string }) => {
  return { type: "display", text: props.text };
};

const Display = resource(useDisplay);

// Counter with render tracking for testing instance preservation
const renderCounts = new Map<string, number>();
const instances = new Map<string, object>();
const useTrackingCounter = (props: { value: number; id: string }) => {
  const currentCount = (renderCounts.get(props.id) || 0) + 1;
  renderCounts.set(props.id, currentCount);

  if (!instances.has(props.id)) {
    instances.set(props.id, { id: `fiber-${props.id}` });
  }

  return {
    value: props.value,
    id: props.id,
    renderCount: currentCount,
    instance: instances.get(props.id),
  };
};

const TrackingCounter = resource(useTrackingCounter);

describe("useResources - Basic Functionality", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  describe("Basic Rendering", () => {
    it("should render multiple resources with keys", () => {
      const testFiber = createTestResource(() => {
        const results = useResources([
          withKey("a", SimpleCounter({ value: 10 })),
          withKey("b", SimpleCounter({ value: 20 })),
          withKey("c", SimpleCounter({ value: 30 })),
        ]);

        return results;
      });

      const value = renderTest(testFiber);
      expect(value).toEqual([{ count: 10 }, { count: 20 }, { count: 30 }]);
    });

    it("should work with resource constructor syntax", () => {
      const useCounter = (props: { value: number }) => {
        const [count] = useState(props.value);
        return { count, double: count * 2 };
      };

      const Counter = resource(useCounter);

      const items = [
        { key: "first", value: 5 },
        { key: "second", value: 10 },
        { key: "third", value: 15 },
      ];

      const testFiber = createTestResource(() => {
        const results = useResources(
          items.map((item) =>
            withKey(item.key, Counter({ value: item.value })),
          ),
        );

        return results;
      });

      const value = renderTest(testFiber);
      expect(value).toEqual([
        { count: 5, double: 10 },
        { count: 10, double: 20 },
        { count: 15, double: 30 },
      ]);
    });
  });

  describe("Instance Preservation", () => {
    it("should maintain resource instances when keys remain the same", () => {
      const testFiber = createTestResource(
        (props: {
          items: Array<{ key: string; value: number; id: string }>;
        }) => {
          return useResources(
            props.items.map((item) =>
              withKey(
                item.key,
                TrackingCounter({ value: item.value, id: item.id }),
              ),
            ),
          );
        },
      );

      // Initial render
      const result1 = renderTest(testFiber, {
        items: [
          { key: "a", value: 1, id: "a" },
          { key: "b", value: 2, id: "b" },
        ],
      });

      // Verify initial state
      expect(result1[0]).toMatchObject({
        id: "a",
        value: 1,
        renderCount: 1,
      });
      expect(result1[1]).toMatchObject({
        id: "b",
        value: 2,
        renderCount: 1,
      });

      // Re-render with same keys but different order and values
      const result2 = renderTest(testFiber, {
        items: [
          { key: "b", value: 20, id: "b" },
          { key: "a", value: 10, id: "a" },
        ],
      });

      // Verify instances are preserved (renderCount should be 2)
      expect(result2[0]).toMatchObject({
        id: "b",
        value: 20,
        renderCount: 2,
      });
      expect(result2[1]).toMatchObject({
        id: "a",
        value: 10,
        renderCount: 2,
      });
    });
  });

  describe("Dynamic List Management", () => {
    it("should handle adding and removing resources", () => {
      const testFiber = createTestResource(
        (props: { items: Array<{ key: string; value: number }> }) => {
          const results = useResources(
            props.items.map((item) =>
              withKey(item.key, SimpleCounter({ value: item.value })),
            ),
          );
          return results;
        },
      );

      // Initial render with 3 items
      const result1 = renderTest(testFiber, {
        items: [
          { key: "a", value: 0 },
          { key: "b", value: 10 },
          { key: "c", value: 20 },
        ],
      });
      expect(result1).toEqual([{ count: 0 }, { count: 10 }, { count: 20 }]);

      // Remove middle item
      const result2 = renderTest(testFiber, {
        items: [
          { key: "a", value: 0 },
          { key: "c", value: 10 },
        ],
      });
      expect(result2).toEqual([{ count: 0 }, { count: 10 }]);

      // Add new item
      const result3 = renderTest(testFiber, {
        items: [
          { key: "a", value: 0 },
          { key: "c", value: 10 },
          { key: "d", value: 20 },
        ],
      });
      expect(result3).toEqual([{ count: 0 }, { count: 10 }, { count: 20 }]);
    });

    it("should handle changing resource types for the same key", () => {
      const testFiber = createTestResource((props: { useCounter: boolean }) => {
        const results = useResources([
          withKey(
            "item",
            props.useCounter
              ? StatefulCounter({ initial: 42 })
              : Display({ text: "Hello" }),
          ),
        ]);
        return results;
      });

      // Start with Counter
      const result1 = renderTest(testFiber, { useCounter: true });
      expect(result1).toEqual([{ count: 42 }]);

      // Switch to Display
      const result2 = renderTest(testFiber, { useCounter: false });
      expect(result2).toEqual([{ type: "display", text: "Hello" }]);

      // Switch back to Counter (new instance)
      const result3 = renderTest(testFiber, { useCounter: true });
      expect(result3).toEqual([{ count: 42 }]);
    });
  });

  describe("Dispatch during commit", () => {
    it("defers a child setup dispatch until the current commit completes", () => {
      const events: string[] = [];
      let childRenders = 0;
      let dispatched = false;
      let setParentN: ((n: number) => void) | null = null;

      const useChild = ({ n }: { n: number }) => {
        childRenders++;
        useEffect(() => {
          events.push(`setup:${n}`);
          if (!dispatched && n === 0) {
            dispatched = true;
            setParentN!(1);
            events.push(`after-dispatch:${n}`);
          }
        }, [n]);
        return childRenders;
      };
      const Child = resource(useChild);

      const testFiber = createTestResource(() => {
        const [n, setN] = useState(0);
        setParentN = setN;
        const [value] = useResources([withKey("k", Child({ n }), [n])]);
        return { n, value };
      });

      renderTest(testFiber);
      expect(events).toEqual(["setup:0", "after-dispatch:0", "setup:1"]);
      expect(getCommittedValue(testFiber)).toEqual({ n: 1, value: 2 });

      setParentN!(0);
      expect(getCommittedValue(testFiber)).toEqual({ n: 0, value: 3 });
    });

    it("flushTapSync inside an effect defers until the pass completes", () => {
      const events: string[] = [];
      let setN: ((n: number) => void) | null = null;

      const root = createTapRoot(function FlushRoot() {
        const [n, setN_] = useState(0);
        setN = setN_;
        useEffect(() => {
          events.push(`setup:${n}`);
          if (n === 0) {
            flushTapSync(() => setN!(1));
            events.push(`after-flush:${n}`);
          }
        }, [n]);
        return n;
      });

      expect(events).toEqual([
        "setup:0",
        "after-flush:0",
        "setup:0",
        "after-flush:0",
        "setup:1",
      ]);
      expect(root.getValue()).toBe(1);
      root.unmount();
    });
  });

  describe("Discarded renders", () => {
    it("discardWipRender reverts an uncommitted render's effect closures", () => {
      const events: string[] = [];
      const fiber = createTestResource((n: number) => {
        useEffect(() => {
          events.push(`setup:${n}`);
          return () => events.push(`cleanup:${n}`);
        }, [n]);
        return n;
      });

      void renderResourceFiber(fiber, [1]);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup:1"]);

      void renderResourceFiber(fiber, [2]);
      discardWipRender(fiber);

      unmountResourceFiber(fiber);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup:1", "cleanup:1", "setup:1"]);
    });

    it("a bailout discards the child render an abandoned pass produced", () => {
      const events: string[] = [];
      const useChild = ({ n }: { n: number }) => {
        useEffect(() => {
          events.push(`setup:${n}`);
          return () => events.push(`cleanup:${n}`);
        }, [n]);
        return n;
      };
      const Child = resource(useChild);
      const useParent = (n: number) =>
        useResources([withKey("k", Child({ n }), [n])]);
      const fiber = createTestResource(useParent);

      void renderResourceFiber(fiber, [1]);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup:1"]);

      void renderResourceFiber(fiber, [2]);
      void renderResourceFiber(fiber, [1]);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup:1"]);

      unmountResourceFiber(fiber);
      commitResourceFiber(fiber);
      expect(events).toEqual(["setup:1", "cleanup:1", "setup:1"]);
    });
  });

  describe("Teardown", () => {
    it("unmounts cleanly when a child rendered but never committed", () => {
      const events: string[] = [];
      const useChild = (key: string) => {
        useEffect(() => {
          events.push(`mount:${key}`);
          return () => events.push(`unmount:${key}`);
        }, []);
        return key;
      };
      const Child = resource(useChild);
      const useParent = (keys: string[]) =>
        useResources(keys.map((k) => withKey(k, Child(k))));

      const fiber = createTestResource(useParent);
      void renderResourceFiber(fiber, [["a"]]);
      commitResourceFiber(fiber);
      expect(events).toEqual(["mount:a"]);

      void renderResourceFiber(fiber, [["a", "b"]]);
      unmountResourceFiber(fiber);
      expect(events).toEqual(["mount:a", "unmount:a"]);
    });
  });
});
