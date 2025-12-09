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

  describe("Basic Rendering", () => {
    it("should render multiple resources with keys", () => {
      const testFiber = createTestResource(() => {
        const results = tapResources(
          { a: 10, b: 20, c: 30 },
          (value) => SimpleCounter({ value }),
          [],
        );

        return results;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toEqual({
        a: { count: 10 },
        b: { count: 20 },
        c: { count: 30 },
      });
    });

    it("should work with resource constructor syntax", () => {
      const Counter = resource((props: { value: number }) => {
        const [count] = tapState(props.value);
        return { count, double: count * 2 };
      });

      const testFiber = createTestResource(() => {
        const items = {
          first: { value: 5 },
          second: { value: 10 },
          third: { value: 15 },
        };

        const results = tapResources(
          items,
          (item) => Counter({ value: item.value }),
          [],
        );

        return results;
      });

      const result = renderTest(testFiber, undefined);
      expect(result).toEqual({
        first: { count: 5, double: 10 },
        second: { count: 10, double: 20 },
        third: { count: 15, double: 30 },
      });
    });
  });

  describe("Instance Preservation", () => {
    it("should maintain resource instances when keys remain the same", () => {
      const testFiber = createTestResource(
        (props: { items: Record<string, { value: number; id: string }> }) => {
          return tapResources(
            props.items,
            (item) => TrackingCounter({ value: item.value, id: item.id }),

            [],
          );
        },
      );

      // Initial render
      const result1 = renderTest(testFiber, {
        items: { a: { value: 1, id: "a" }, b: { value: 2, id: "b" } },
      });

      // Verify initial state
      expect(result1.a).toMatchObject({
        id: "a",
        value: 1,
        renderCount: 1,
      });
      expect(result1.b).toMatchObject({
        id: "b",
        value: 2,
        renderCount: 1,
      });

      // Re-render with same keys but different values
      const result2 = renderTest(testFiber, {
        items: { b: { value: 20, id: "b" }, a: { value: 10, id: "a" } },
      });

      // Verify instances are preserved
      expect(result2.b).toMatchObject({
        id: "b",
        value: 20,
        renderCount: 2,
      });
      expect(result2.a).toMatchObject({
        id: "a",
        value: 10,
        renderCount: 2,
      });
    });
  });

  describe("Dynamic List Management", () => {
    it("should handle adding and removing resources", () => {
      const testFiber = createTestResource(
        (props: { items: Record<string, number> }) => {
          const results = tapResources(
            props.items,
            (value) => SimpleCounter({ value }),

            [],
          );
          return results;
        },
      );

      // Initial render with 3 items
      const result1 = renderTest(testFiber, { items: { a: 0, b: 10, c: 20 } });
      expect(result1).toEqual({
        a: { count: 0 },
        b: { count: 10 },
        c: { count: 20 },
      });

      // Remove middle item
      const result2 = renderTest(testFiber, { items: { a: 0, c: 10 } });
      expect(result2).toEqual({
        a: { count: 0 },
        c: { count: 10 },
      });

      // Add new item
      const result3 = renderTest(testFiber, { items: { a: 0, c: 10, d: 20 } });
      expect(result3).toEqual({
        a: { count: 0 },
        c: { count: 10 },
        d: { count: 20 },
      });
    });

    it("should handle changing resource types for the same key", () => {
      const testFiber = createTestResource((props: { useCounter: boolean }) => {
        const results = tapResources(
          { item: props.useCounter },
          (useCounter) =>
            useCounter
              ? StatefulCounter({ initial: 42 })
              : Display({ text: "Hello" }),
          [],
        );
        return results;
      });

      // Start with Counter
      const result1 = renderTest(testFiber, { useCounter: true });
      expect(result1).toEqual({ item: { count: 42 } });

      // Switch to Display
      const result2 = renderTest(testFiber, { useCounter: false });
      expect(result2).toEqual({ item: { type: "display", text: "Hello" } });

      // Switch back to Counter (new instance)
      const result3 = renderTest(testFiber, { useCounter: true });
      expect(result3).toEqual({ item: { count: 42 } });
    });
  });
});
