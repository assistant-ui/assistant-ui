import { describe, it, expect, afterEach } from "vitest";
import { useResources } from "../../hooks/useResources";
import { useState } from "../../react-hooks/useState";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  createCounterResource,
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
});
