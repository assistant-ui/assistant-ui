import { describe, it, expect } from "vitest";
import { useEffect } from "../../hooks/useEffect";
import { useState } from "../../hooks/useState";
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
        useState(1);
        useEffect(() => {}, []);
      } else {
        useEffect(() => {}, []);
        useState(1);
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
    let addEffect = false;

    const resource = createTestResource(() => {
      if (addEffect) {
        useEffect(() => {});
      } else {
        useState(0);
      }
      return null;
    });

    renderTest(resource, undefined);

    // Change to use different hook type
    addEffect = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Hook order changed between renders",
    );
  });

  it("should throw with conditional hooks", () => {
    let condition = true;

    const resource = createTestResource(() => {
      useState(1);

      if (condition) {
        useState(2); // Conditional hook
      }

      useState(3);
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
        const [value] = useState(item);
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
        useState(item);
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
      const [a] = useState(1);
      useEffect(() => {});
      const [b] = useState(2);
      useEffect(() => {});
      const [c] = useState(3);

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
      const [a] = useState(1);

      if (shouldReturn) {
        return a; // Early return
      }

      const [b] = useState(2);
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
      const [count, setCount] = useState(0);

      // This effect contains a hook call, which is invalid
      useEffect(() => {
        if (count > 0) {
          expect(() => {
            const [_nested] = useState(0); // Invalid: hook inside effect
          }).toThrow("No resource fiber available");
        }
      });

      // Use an effect to trigger the state change
      useEffect(() => {
        if (count === 0) {
          setCount(1);
        }
      }, [count]);

      return count;
    });

    renderTest(resource, undefined);
  });
});
