import { describe, it, expect } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import { createTestResource, renderTest } from "../test-utils";
import {
  renderResourceFiber,
  commitResourceFiber,
} from "../../core/ResourceFiber";

describe("Rules of Hooks - Hook Order", () => {
  it("should throw when hooks are called in different order", () => {
    let condition = true;

    const resource = createTestResource(() => {
      if (condition) {
        tapState(1);
        tapEffect(() => {}, []);
      } else {
        tapEffect(() => {}, []);
        tapState(1);
      }
      return null;
    });

    // First render establishes order
    renderTest(resource, undefined);

    // Change condition
    condition = false;

    // Second render with different order should throw
    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Hook order changed between renders",
    );
  });

  it("should throw when hook types change between renders", () => {
    let useEffect = false;

    const resource = createTestResource(() => {
      if (useEffect) {
        tapEffect(() => {});
      } else {
        tapState(0);
      }
      return null;
    });

    renderTest(resource, undefined);

    // Change to use different hook type
    useEffect = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Hook order changed between renders",
    );
  });

  it("should throw with conditional hooks", () => {
    let condition = true;

    const resource = createTestResource(() => {
      tapState(1);

      if (condition) {
        tapState(2); // Conditional hook
      }

      tapState(3);
      return null;
    });

    renderTest(resource, undefined);

    // Change condition
    condition = false;

    // Should throw because hook count changed
    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should allow hooks in loops with consistent count", () => {
    const items = [1, 2, 3];

    const resource = createTestResource(() => {
      const states = items.map((item) => {
        const [value] = tapState(item);
        return value;
      });

      return states;
    });

    const result = renderTest(resource, undefined);
    expect(result).toEqual([1, 2, 3]);

    // Re-render should work fine
    expect(() => renderResourceFiber(resource, undefined)).not.toThrow();
  });

  it("should throw when hooks in loops have inconsistent count", () => {
    let items = [1, 2, 3];

    const resource = createTestResource(() => {
      items.forEach((item) => {
        tapState(item);
      });
      return null;
    });

    renderTest(resource, undefined);

    // Change array length
    items = [1, 2];

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should maintain order with mixed hook types", () => {
    const resource = createTestResource(() => {
      const [a] = tapState(1);
      tapEffect(() => {});
      const [b] = tapState(2);
      tapEffect(() => {});
      const [c] = tapState(3);

      return { a, b, c };
    });

    const result = renderTest(resource, undefined);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });

    // Re-render should maintain same order
    const ctx = renderResourceFiber(resource, undefined);
    expect(() => commitResourceFiber(resource, ctx)).not.toThrow();
  });

  it("should detect early return causing different hook counts", () => {
    let shouldReturn = false;

    const resource = createTestResource(() => {
      const [a] = tapState(1);

      if (shouldReturn) {
        return a; // Early return
      }

      const [b] = tapState(2);
      return a + b;
    });

    const result1 = renderTest(resource, undefined);
    expect(result1).toBe(3);

    // Enable early return
    shouldReturn = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered 1 hooks but expected 2",
    );
  });

  it("should throw on nested hook calls", () => {
    const resource = createTestResource(() => {
      const [count, setCount] = tapState(0);

      // This effect contains a hook call, which is invalid
      tapEffect(() => {
        if (count > 0) {
          expect(() => {
            const [_nested] = tapState(0); // Invalid: hook inside effect
          }).toThrow("No resource fiber available");
        }
      });

      // Use an effect to trigger the state change
      tapEffect(() => {
        if (count === 0) {
          setCount(1);
        }
      }, [count]);

      return count;
    });

    renderTest(resource, undefined);
  });
});
