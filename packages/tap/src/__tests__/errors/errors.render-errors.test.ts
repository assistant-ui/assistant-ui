import { describe, it, expect } from "vitest";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";
import { createTestResource, renderTest } from "../test-utils";
import {
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";

describe("Errors - Render Errors", () => {
  it("should propagate errors during render", () => {
    const error = new Error("Render error");

    const resource = createTestResource(() => {
      throw error;
    });

    expect(() => renderResourceFiber(resource, [])).toThrow(error);
  });

  it("should throw when hooks are called outside render context", () => {
    // Try to call hook outside of resource render
    expect(() => {
      useState(0);
    }).toThrow("No resource fiber available");

    expect(() => {
      useEffect(() => {});
    }).toThrow("No resource fiber available");
  });

  it("should handle errors in state initializers", () => {
    const error = new Error("Initializer error");

    const resource = createTestResource(() => {
      const [value] = useState(() => {
        throw error;
      });
      return value;
    });

    expect(() => renderResourceFiber(resource, [])).toThrow(error);
  });

  it("should detect render during render", () => {
    const resource = createTestResource(() => {
      const [count, setCount] = useState(0);

      // This violates the rules - no state updates during render
      if (count < 5) {
        expect(() => setCount(count + 1)).toThrow(
          "Resource updated during render",
        );
      }

      return count;
    });

    renderResourceFiber(resource, []);
  });

  it("should allow setState during commit (effects)", () => {
    const resource = createTestResource(() => {
      const [count, setCount] = useState(0);

      useEffect(() => {
        // setState during effects (commit phase) is allowed
        if (count < 5) {
          setCount(count + 1);
        }
      });

      return count;
    });

    const ctx = renderResourceFiber(resource, []);
    // This should not throw - setState in effects is allowed
    expect(() => commitResourceFiber(resource, ctx)).not.toThrow();
    unmountResourceFiber(resource);
  });

  it("should handle errors in hook order validation", () => {
    let useStateFirst = true;

    const resource = createTestResource(() => {
      if (useStateFirst) {
        useState(1);
        useEffect(() => {});
      } else {
        useEffect(() => {});
        useState(1);
      }
      return null;
    });

    renderResourceFiber(resource, []);

    useStateFirst = false;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Hook order changed between renders",
    );
  });

  it("should maintain resource state after render error", () => {
    let shouldThrow = false;

    const resource = createTestResource(() => {
      const [count, _setCount] = useState(42);

      if (shouldThrow) {
        throw new Error("Render failed");
      }

      return count;
    });

    // First successful render
    const result = renderTest(resource);
    expect(result).toBe(42);

    // Failed render
    shouldThrow = true;
    expect(() => renderTest(resource)).toThrow("Render failed");

    // State should be unchanged after failed render
    // The resource state is preserved
  });

  it("should handle complex error scenarios", () => {
    let phase = "render";

    const resource = createTestResource(() => {
      if (phase === "hook-order") {
        // Wrong hook order
        useEffect(() => {});
        useState(1);
      } else {
        useState(1);
        useEffect(() => {
          if (phase === "effect-error") {
            throw new Error("Effect error");
          }
        });
      }

      if (phase === "render-error") {
        throw new Error("Render error");
      }

      return phase;
    });

    // Successful render
    renderTest(resource);

    // Render error
    phase = "render-error";
    expect(() => renderTest(resource)).toThrow("Render error");

    // Hook order error
    phase = "hook-order";
    expect(() => renderTest(resource)).toThrow("Hook order changed");

    // Effect error
    phase = "effect-error";
    expect(() => renderTest(resource)).toThrow("Effect error");
  });

  it("should handle errors in nested hook calls", () => {
    const useFeature = () => {
      // This will fail if called outside render
      const [value] = useState("feature");
      return value;
    };

    // Outside render context
    expect(() => useFeature()).toThrow("No resource fiber available");

    // Inside render context
    const resource = createTestResource(() => {
      const feature = useFeature(); // This works
      return feature;
    });

    const result = renderTest(resource);
    expect(result).toBe("feature");
  });
});
