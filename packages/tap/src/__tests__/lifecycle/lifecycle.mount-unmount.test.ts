import { describe, it, expect, vi } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import { createTestResource, renderTest, unmountResource } from "../test-utils";
import {
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";

describe("Lifecycle - Mount/Unmount", () => {
  it("should run all effects on mount", () => {
    const effects = [vi.fn(), vi.fn(), vi.fn()];

    const resource = createTestResource(() => {
      effects.forEach((fn) => tapEffect(fn));
      return null;
    });

    renderTest(resource, undefined);

    effects.forEach((fn) => {
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  it("should cleanup all effects on unmount", () => {
    const cleanups = [vi.fn(), vi.fn(), vi.fn()];

    const resource = createTestResource(() => {
      cleanups.forEach((cleanup) => {
        tapEffect(() => cleanup);
      });
      return null;
    });

    renderTest(resource, undefined);
    cleanups.forEach((fn) => expect(fn).not.toHaveBeenCalled());

    unmountResource(resource);
    cleanups.forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  it("should cleanup effects in reverse order", () => {
    const order: number[] = [];

    const resource = createTestResource(() => {
      tapEffect(() => () => order.push(1));
      tapEffect(() => () => order.push(2));
      tapEffect(() => () => order.push(3));
      return null;
    });

    renderTest(resource, undefined);
    unmountResource(resource);

    expect(order).toEqual([3, 2, 1]);
  });

  it("should preserve state across re-renders", () => {
    let renderCount = 0;
    let setState: any;
    let effectRunCount = 0;

    const resource = createTestResource((props: number) => {
      renderCount++;
      const [state, _setState] = tapState({ count: 0 });
      setState = _setState;

      // Simple effect that tracks runs
      tapEffect(() => {
        effectRunCount++;
      });

      return { ...state, renderCount, currentProps: props };
    });

    const result1 = renderTest(resource, 1);
    expect(result1.count).toBe(0);
    expect(result1.renderCount).toBe(1);
    expect(effectRunCount).toBe(1);

    // Update state manually - should trigger re-render
    setState({ count: 42 });

    // Re-render with same input - note: renderTest always renders
    const result2 = renderTest(resource, 1);
    expect(result2.count).toBe(42); // State preserved
    expect(result2.currentProps).toBe(1); // Same props
    expect(result2.renderCount).toBe(3); // 1 initial + 1 from setState + 1 from renderResource

    // Re-render with new input
    const result3 = renderTest(resource, 2);
    expect(result3.count).toBe(42); // State still preserved
    expect(result3.currentProps).toBe(2); // New props used
    expect(result3.renderCount).toBe(4); // Another render
  });

  it("should handle mixed state and effects lifecycle", () => {
    const log: string[] = [];

    const resource = createTestResource(() => {
      const [mounted, setMounted] = tapState(false);

      log.push("render");

      tapEffect(() => {
        log.push("effect-1");
        setMounted(true);

        return () => log.push("cleanup-1");
      });

      tapEffect(() => {
        log.push("effect-2");
        return () => log.push("cleanup-2");
      });

      return mounted;
    });

    // Initial render
    const ctx = renderResourceFiber(resource, undefined);
    expect(log).toEqual(["render"]);

    // Commit - effects will run
    commitResourceFiber(resource, ctx);
    // After commit: initial render + effects
    expect(log).toEqual(["render", "effect-1", "effect-2"]);

    // The setState in effect schedules a re-render
    // With the new architecture, we need to manually trigger it
    const ctx2 = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx2);

    // Now we should see the re-render and cleanup/re-run of effects
    expect(log).toEqual([
      "render",
      "effect-1",
      "effect-2",
      "render", // Re-render triggered by setMounted(true)
      "cleanup-1", // Cleanup from first render
      "effect-1", // Effect from re-render
      "cleanup-2", // Cleanup from first render
      "effect-2", // Effect from re-render
    ]);

    // Clear log for unmount testing
    log.length = 0;

    // Unmount
    unmountResourceFiber(resource);
    expect(log).toEqual(["cleanup-2", "cleanup-1"]);
  });

  it("should handle cleanup errors gracefully", () => {
    const error = new Error("Cleanup error");
    const goodCleanup = vi.fn();

    const resource = createTestResource(() => {
      tapEffect(() => () => {
        throw error;
      });
      tapEffect(() => goodCleanup);
      return null;
    });

    renderTest(resource, undefined);

    // Unmount should throw the error
    expect(() => unmountResource(resource)).toThrow(error);
    expect(goodCleanup).toHaveBeenCalled();
  });

  it("should not run cleanup if effect never ran", () => {
    const cleanup = vi.fn();
    const skipEffect = true;

    const resource = createTestResource(() => {
      if (!skipEffect) {
        tapEffect(() => cleanup);
      }
      return null;
    });

    renderTest(resource, undefined);
    unmountResource(resource);

    expect(cleanup).not.toHaveBeenCalled();
  });

  it("should handle immediate unmount after mount", () => {
    const effect = vi.fn();
    const cleanup = vi.fn();

    const resource = createTestResource(() => {
      tapEffect(() => {
        effect();
        return cleanup;
      });
      return null;
    });

    const ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);
    unmountResourceFiber(resource);

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
