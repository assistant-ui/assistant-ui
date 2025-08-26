import { describe, it, expect, vi, afterEach } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
  TestResourceManager,
} from "../test-utils";

describe("tapEffect - Basic Functionality", () => {
  afterEach(() => {
    cleanupAllResources();
  });

  describe("Effect Lifecycle", () => {
    it("should run effect after mount and commit", () => {
      const executionOrder: string[] = [];

      const testFiber = createTestResource(() => {
        executionOrder.push("render");

        tapEffect(() => {
          executionOrder.push("effect");
        });

        return null;
      });

      // Use TestResourceManager for fine-grained control
      const manager = new TestResourceManager(testFiber);

      // Mount and render
      manager.renderAndMount(undefined);

      // Effect should run after commit
      expect(executionOrder).toEqual(["render", "effect"]);

      manager.cleanup();
    });

    it("should call cleanup function on unmount", () => {
      const cleanup = vi.fn();
      const effect = vi.fn(() => cleanup);

      const testFiber = createTestResource(() => {
        tapEffect(effect);
        return null;
      });

      const manager = new TestResourceManager(testFiber);
      manager.renderAndMount(undefined);

      // Effect should be called, but not cleanup
      expect(effect).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      // Cleanup should be called on unmount
      manager.cleanup();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("should cleanup effects in reverse order", () => {
      const cleanupOrder: string[] = [];

      const testFiber = createTestResource(() => {
        tapEffect(() => {
          return () => cleanupOrder.push("first");
        });

        tapEffect(() => {
          return () => cleanupOrder.push("second");
        });

        tapEffect(() => {
          return () => cleanupOrder.push("third");
        });

        return null;
      });

      const manager = new TestResourceManager(testFiber);
      manager.renderAndMount(undefined);
      manager.cleanup();

      // Cleanup should run in reverse order (LIFO)
      expect(cleanupOrder).toEqual(["third", "second", "first"]);
    });
  });

  describe("Multiple Effects", () => {
    it("should execute multiple effects in registration order", () => {
      const executionOrder: string[] = [];
      const effects = [
        () => {
          executionOrder.push("effect1");
        },
        () => {
          executionOrder.push("effect2");
        },
        () => {
          executionOrder.push("effect3");
        },
      ];

      const testFiber = createTestResource(() => {
        effects.forEach((fn) => tapEffect(fn));
        return null;
      });

      renderTest(testFiber, undefined);
      expect(executionOrder).toEqual(["effect1", "effect2", "effect3"]);
    });

    it("should handle mixed effects with and without dependencies", () => {
      const effectCalls = {
        always: 0,
        once: 0,
        conditional: 0,
      };

      const testFiber = createTestResource((props: { value: number }) => {
        // Effect without deps - runs on every render
        tapEffect(() => {
          effectCalls.always++;
        });

        // Effect with empty deps - runs only once
        tapEffect(() => {
          effectCalls.once++;
        }, []);

        // Effect with deps - runs when deps change
        tapEffect(() => {
          effectCalls.conditional++;
        }, [props.value]);

        return effectCalls;
      });

      // Initial render
      renderTest(testFiber, { value: 1 });
      expect(effectCalls).toEqual({ always: 1, once: 1, conditional: 1 });

      // Re-render with same props
      renderTest(testFiber, { value: 1 });
      expect(effectCalls).toEqual({ always: 2, once: 1, conditional: 1 });

      // Re-render with different props
      renderTest(testFiber, { value: 2 });
      expect(effectCalls).toEqual({ always: 3, once: 1, conditional: 2 });
    });
  });

  describe("Effect Dependencies", () => {
    it("should not re-run effect with empty dependency array", () => {
      const effect = vi.fn();
      let triggerRerender: (() => void) | null = null;

      const testFiber = createTestResource(() => {
        const [, setState] = tapState(0);

        tapEffect(() => {
          triggerRerender = () => setState((prev) => prev + 1);
        });

        tapEffect(effect, []);

        return null;
      });

      // Initial render
      renderTest(testFiber, undefined);
      expect(effect).toHaveBeenCalledTimes(1);

      // Trigger re-render
      triggerRerender!();

      // Effect with empty deps should not re-run
      expect(effect).toHaveBeenCalledTimes(1);
    });

    it("should re-run effect when dependencies change", () => {
      const effect = vi.fn();

      const testFiber = createTestResource((props: { dep: string }) => {
        tapEffect(() => {
          effect(props.dep);
        }, [props.dep]);

        return null;
      });

      // Initial render
      renderTest(testFiber, { dep: "a" });
      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenLastCalledWith("a");

      // Re-render with same dependency
      renderTest(testFiber, { dep: "a" });
      expect(effect).toHaveBeenCalledTimes(1);

      // Re-render with different dependency
      renderTest(testFiber, { dep: "b" });
      expect(effect).toHaveBeenCalledTimes(2);
      expect(effect).toHaveBeenLastCalledWith("b");
    });
  });

  describe("Effect Timing", () => {
    it("should run effects after state updates are committed", () => {
      const events: string[] = [];

      const testFiber = createTestResource(() => {
        const [count, setCount] = tapState(0);

        events.push(`render: ${count}`);

        tapEffect(() => {
          events.push(`effect: ${count}`);

          // Only update on first effect to avoid infinite loop
          if (count === 0) {
            setCount(1);
          }
        });

        return count;
      });

      const manager = new TestResourceManager(testFiber);

      // Initial render
      manager.renderAndMount(undefined);
      // Without mount tracking, the effect runs immediately during commit
      // This triggers setState which causes a synchronous re-render
      expect(events).toEqual([
        "render: 0",
        "effect: 0",
        "render: 1",
        "effect: 1",
      ]);

      manager.cleanup();
    });
  });
});
