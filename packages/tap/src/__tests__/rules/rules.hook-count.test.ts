import { describe, it, expect } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import { createTestResource, renderTest } from "../test-utils";
import { renderResourceFiber } from "../../core/ResourceFiber";

describe("Rules of Hooks - Hook Count", () => {
  it("should establish hook count on first render", () => {
    const resource = createTestResource(() => {
      const [a] = tapState(1);
      const [b] = tapState(2);
      const [c] = tapState(3);
      tapEffect(() => {});
      tapEffect(() => {});

      return { a, b, c };
    });

    // First render establishes 5 hooks
    renderTest(resource, undefined);

    // Second render should work with same count
    expect(() => {
      renderTest(resource, undefined);
    }).not.toThrow();
  });

  it("should throw when rendering more hooks than first render", () => {
    let addExtraHook = false;

    const resource = createTestResource(() => {
      tapState(1);
      tapState(2);

      if (addExtraHook) {
        tapState(3); // Extra hook
      }

      return null;
    });

    // First render with 2 hooks
    renderResourceFiber(resource, undefined);

    // Try to render with 3 hooks
    addExtraHook = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });

  it("should throw when rendering fewer hooks than first render", () => {
    let skipHook = false;

    const resource = createTestResource(() => {
      tapState(1);

      if (!skipHook) {
        tapState(2);
      }

      tapState(3);
      return null;
    });

    // First render with 3 hooks
    renderResourceFiber(resource, undefined);

    // Try to render with 2 hooks
    skipHook = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should detect hook count mismatch with effects", () => {
    let includeEffect = true;

    const resource = createTestResource(() => {
      tapState(1);
      tapState(2);

      if (includeEffect) {
        tapEffect(() => {});
      }
      return null;
    });

    renderResourceFiber(resource, undefined);

    includeEffect = false;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should handle zero hooks consistently", () => {
    const resource = createTestResource(() => {
      // No hooks
      return "no hooks";
    });

    renderTest(resource, undefined);

    // Should allow multiple renders with zero hooks
    expect(() => renderTest(resource, undefined)).not.toThrow();
  });

  it("should detect dynamic hook creation", () => {
    let hookCount = 2;

    const resource = createTestResource(() => {
      for (let i = 0; i < hookCount; i++) {
        tapState(i);
      }
      return null;
    });

    renderResourceFiber(resource, undefined);

    // Change hook count
    hookCount = 3;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });

  it("should maintain count across multiple re-renders", () => {
    let renderCount = 0;

    const resource = createTestResource(() => {
      renderCount++;
      const [a] = tapState(1);
      const [b] = tapState(2);
      tapEffect(() => {});

      return { a, b, renderCount };
    });

    // Multiple renders should all maintain same hook count
    for (let i = 0; i < 5; i++) {
      expect(() => renderTest(resource, undefined)).not.toThrow();
    }

    expect(renderCount).toBe(5);
  });

  it("should track count separately for different resource instances", () => {
    const resource1 = createTestResource(() => {
      tapState(1);
      tapState(2);
      return "two hooks";
    });

    const resource2 = createTestResource(() => {
      tapState(1);
      tapState(2);
      tapState(3);
      tapEffect(() => {});
      return "four hooks";
    });

    // Render both
    renderTest(resource1, undefined);
    renderTest(resource2, undefined);

    // Each should maintain its own count
    expect(() => renderTest(resource1, undefined)).not.toThrow();
    expect(() => renderTest(resource2, undefined)).not.toThrow();
  });

  it("should detect hook count changes in nested function calls", () => {
    let useExtraHooks = false;

    const useFeature = () => {
      tapState("feature");
      if (useExtraHooks) {
        tapState("extra");
      }
    };

    const resource = createTestResource(() => {
      tapState("main");
      useFeature();
      return null;
    });

    renderResourceFiber(resource, undefined);

    useExtraHooks = true;

    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });
});
