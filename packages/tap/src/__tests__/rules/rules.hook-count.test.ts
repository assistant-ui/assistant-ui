/* oxlint-disable react/rules-of-hooks -- tests deliberately exercise conditional/nested hook patterns */
import { describe, it, expect } from "vitest";
import { useEffect } from "../../hooks/useEffect";
import { useState } from "../../hooks/useState";
import { createTestResource, renderTest } from "../test-utils";
import { renderResourceFiber } from "../../core/ResourceFiber";

describe("Rules of Hooks - Hook Count", () => {
  it("should establish hook count on first render", () => {
    const resource = createTestResource(() => {
      const [a] = useState(1);
      const [b] = useState(2);
      const [c] = useState(3);
      useEffect(() => {});
      useEffect(() => {});

      return { a, b, c };
    });

    // First render establishes 5 hooks
    renderTest(resource);

    // Second render should work with same count
    expect(() => {
      renderTest(resource);
    }).not.toThrow();
  });

  it("should throw when rendering more hooks than first render", () => {
    let addExtraHook = false;

    const resource = createTestResource(() => {
      useState(1);
      useState(2);

      if (addExtraHook) {
        useState(3); // Extra hook
      }

      return null;
    });

    // First render with 2 hooks
    renderResourceFiber(resource, []);

    // Try to render with 3 hooks
    addExtraHook = true;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });

  it("should throw when rendering fewer hooks than first render", () => {
    let skipHook = false;

    const resource = createTestResource(() => {
      useState(1);

      if (!skipHook) {
        useState(2);
      }

      useState(3);
      return null;
    });

    // First render with 3 hooks
    renderResourceFiber(resource, []);

    // Try to render with 2 hooks
    skipHook = true;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should detect hook count mismatch with effects", () => {
    let includeEffect = true;

    const resource = createTestResource(() => {
      useState(1);
      useState(2);

      if (includeEffect) {
        useEffect(() => {});
      }
      return null;
    });

    renderResourceFiber(resource, []);

    includeEffect = false;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Rendered 2 hooks but expected 3",
    );
  });

  it("should handle zero hooks consistently", () => {
    const resource = createTestResource(() => {
      // No hooks
      return "no hooks";
    });

    renderTest(resource);

    // Should allow multiple renders with zero hooks
    expect(() => renderTest(resource)).not.toThrow();
  });

  it("should detect dynamic hook creation", () => {
    let hookCount = 2;

    const resource = createTestResource(() => {
      for (let i = 0; i < hookCount; i++) {
        useState(i);
      }
      return null;
    });

    renderResourceFiber(resource, []);

    // Change hook count
    hookCount = 3;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });

  it("should maintain count across multiple re-renders", () => {
    let renderCount = 0;

    const resource = createTestResource(() => {
      renderCount++;
      const [a] = useState(1);
      const [b] = useState(2);
      useEffect(() => {});

      return { a, b, renderCount };
    });

    // Multiple renders should all maintain same hook count
    for (let i = 0; i < 5; i++) {
      expect(() => renderTest(resource)).not.toThrow();
    }

    expect(renderCount).toBe(5);
  });

  it("should track count separately for different resource instances", () => {
    const resource1 = createTestResource(() => {
      useState(1);
      useState(2);
      return "two hooks";
    });

    const resource2 = createTestResource(() => {
      useState(1);
      useState(2);
      useState(3);
      useEffect(() => {});
      return "four hooks";
    });

    // Render both
    renderTest(resource1);
    renderTest(resource2);

    // Each should maintain its own count
    expect(() => renderTest(resource1)).not.toThrow();
    expect(() => renderTest(resource2)).not.toThrow();
  });

  it("should detect hook count changes in nested function calls", () => {
    let useExtraHooks = false;

    const useFeature = () => {
      useState("feature");
      if (useExtraHooks) {
        useState("extra");
      }
    };

    const resource = createTestResource(() => {
      useState("main");
      useFeature();
      return null;
    });

    renderResourceFiber(resource, []);

    useExtraHooks = true;

    expect(() => renderResourceFiber(resource, [])).toThrow(
      "Rendered more hooks than during the previous render",
    );
  });
});
