import { describe, it, expect, afterEach } from "vitest";
import { tapResources } from "../../hooks/tap-resources";
import { tapState } from "../../hooks/tap-state";
import { resource } from "../../core/resource";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  createCounterResource,
} from "../test-utils";

// ============================================================================
// Test Resources
// ============================================================================

// Simple counter that just returns the value
const SimpleCounter = resource(createCounterResource());

// Stateful counter that tracks its own count
const StatefulCounter = resource((props: { initial: number }) => {
  const [count] = tapState(props.initial);
  return { count };
});

// Display component for testing type changes
const Display = resource((props: { text: string }) => {
  return { type: "display", text: props.text };
});

// Counter with render tracking for testing instance preservation
const renderCounts = new Map<string, number>();
const instances = new Map<string, object>();
const TrackingCounter = resource((props: { value: number; id: string }) => {
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
});

// ============================================================================
// Tests
// ============================================================================

describe("tapResources - Basic Functionality", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  describe("Key Validation", () => {
    it("should require all keys to be unique", () => {
      const testFiber = createTestResource(() => {
        expect(() => {
          tapResources([
            ["a", SimpleCounter({ value: 1 })],
            ["b", SimpleCounter({ value: 2 })],
            ["a", SimpleCounter({ value: 3 })], // Duplicate!
          ]);
        }).toThrowError('Duplicate key "a" found');

        return null;
      });

      renderTest(testFiber, undefined);
    });
  });

  describe("Basic Rendering", () => {
    it("should render multiple resources with keys", () => {
      const testFiber = createTestResource(() => {
        const results = tapResources([
          ["a", SimpleCounter({ value: 10 })],
          ["b", SimpleCounter({ value: 20 })],
          ["c", SimpleCounter({ value: 30 })],
        ]);

        return results;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toEqual([{ count: 10 }, { count: 20 }, { count: 30 }]);
    });

    it("should work with resource constructor syntax", () => {
      const Counter = resource((props: { value: number }) => {
        const [count] = tapState(props.value);
        return { count, double: count * 2 };
      });

      const testFiber = createTestResource(() => {
        const items = [
          { value: 5, id: "first" },
          { value: 10, id: "second" },
          { value: 15, id: "third" },
        ];

        const results = tapResources(
          items.map((item) => [item.id, Counter({ value: item.value })]),
        );

        return results;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toEqual([
        { count: 5, double: 10 },
        { count: 10, double: 20 },
        { count: 15, double: 30 },
      ]);
    });
  });

  describe("Instance Preservation", () => {
    it("should maintain resource instances when keys remain the same", () => {
      const testFiber = createTestResource(
        (props: { items: Array<{ key: string; value: number }> }) => {
          return tapResources(
            props.items.map((item) => [
              item.key,
              TrackingCounter({ value: item.value, id: item.key }),
            ]),
          );
        },
      );

      // Initial render
      const result1 = renderTest(testFiber, {
        items: [
          { key: "a", value: 1 },
          { key: "b", value: 2 },
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
          { key: "b", value: 20 },
          { key: "a", value: 10 },
        ],
      });

      // Verify instances are preserved despite reordering
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
      const testFiber = createTestResource((props: { keys: string[] }) => {
        const results = tapResources(
          props.keys.map((key, index) => [key, SimpleCounter({ value: index * 10 })]),
        );
        return results;
      });

      // Initial render with 3 items
      const result1 = renderTest(testFiber, { keys: ["a", "b", "c"] });
      expect(result1).toEqual([{ count: 0 }, { count: 10 }, { count: 20 }]);

      // Remove middle item
      const result2 = renderTest(testFiber, { keys: ["a", "c"] });
      expect(result2).toEqual([
        { count: 0 },
        { count: 10 }, // Index changed but we're using index for value
      ]);

      // Add new item
      const result3 = renderTest(testFiber, { keys: ["a", "c", "d"] });
      expect(result3).toEqual([{ count: 0 }, { count: 10 }, { count: 20 }]);
    });

    it("should handle changing resource types for the same key", () => {
      const testFiber = createTestResource((props: { useCounter: boolean }) => {
        const results = tapResources([
          props.useCounter
            ? ["item", StatefulCounter({ initial: 42 })]
            : ["item", Display({ text: "Hello" })],
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
