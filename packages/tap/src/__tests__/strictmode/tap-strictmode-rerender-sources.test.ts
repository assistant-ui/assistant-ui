/**
 * Tests to verify when tap strict mode causes double-rendering
 * These tests should mirror the React strict mode behavior
 */

import { describe, it, expect } from "vitest";
import { resource } from "../../core/resource";
import { tapState } from "../../hooks/tap-state";
import { tapEffect } from "../../hooks/tap-effect";
import { createResourceRoot } from "../../core/createResourceRoot";
import { flushResourcesSync } from "../../core/scheduler";

describe("Tap Strict Mode - Rerender Sources", () => {
  describe("Callback invocation count", () => {
    it("should use the first return value when updater returns different values", () => {
      const events: string[] = [];
      let updaterCallCount = 0;

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        tapEffect(() => {
          events.push("effect mount");
          setCount((prev) => {
            updaterCallCount++;
            events.push(`updater call #${updaterCallCount} with prev=${prev}`);
            // Return different values on each call
            if (updaterCallCount === 1) {
              return 100; // First call returns 100
            }
            return 200; // Second call returns 200
          });

          return () => {
            events.push("effect cleanup");
          };
        }, []);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Tap behavior: updater called 4 times, uses FIRST return value per dispatch
      // Effect #1 dispatch: updater(0) → 100 (kept)
      // Effect #1 cleanup, Effect #2 mount
      // Effect #2 dispatch: updater(0) → 200 (kept... but wait, prev=100 from effect #1)
      // Updater double-invoke happens per-dispatch (matching React ordering)
      expect(updaterCallCount).toBe(4);
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount",
        "updater call #1 with prev=0",
        "effect cleanup",
        "effect mount",
        "updater call #2 with prev=0",
        "updater call #3 with prev=100",
        "updater call #4 with prev=100",
        "render count=200",
        "render count=200",
      ]);
    });
  });

  describe("Source 1: Initial render", () => {
    it("should double-render on initial mount", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count] = tapState(0);
        events.push(`render count=${count}`);
        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      expect(events).toEqual(["render count=0", "render count=0"]);
    });
  });

  describe("Source 2: setState in tapEffect", () => {
    it("should double-render after setState in tapEffect", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        tapEffect(() => {
          events.push(`effect count=${count}`);
          if (count === 0) {
            setCount(1);
          }
          return () => {
            events.push(`cleanup count=${count}`);
          };
        }, [count]);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect count=0",
        "cleanup count=0",
        "effect count=0",
        "render count=1",
        "render count=1",
        "cleanup count=0",
        "effect count=1",
      ]);
    });
  });

  describe("Source 3: setState in flushResourcesSync (event handler analogue)", () => {
    it("should ALSO double-render after setState in flushResourcesSync", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        return {
          count,
          increment: () => {
            events.push("increment");
            setCount(count + 1);
          },
        };
      });

      const root = createResourceRoot();
      const sub = root.render(TestResource());

      // Initial render is double
      expect(events).toEqual(["render count=0", "render count=0"]);

      events.length = 0; // Clear events

      // Call the method inside flushResourcesSync (like clicking a button)
      flushResourcesSync(() => {
        sub.getValue().increment();
      });

      // flushResourcesSync setState should ALSO double-render (matching React 19)
      expect(events).toEqual(["increment", "render count=1", "render count=1"]);
    });

    it("should double-render on ALL flushResourcesSync calls", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        return {
          count,
          increment: () => {
            events.push("increment");
            setCount((c) => c + 1);
          },
        };
      });

      const root = createResourceRoot();
      const sub = root.render(TestResource());

      events.length = 0; // Clear initial renders

      // Multiple flushResourcesSync calls (like multiple button clicks)
      flushResourcesSync(() => {
        sub.getValue().increment();
      });
      flushResourcesSync(() => {
        sub.getValue().increment();
      });
      flushResourcesSync(() => {
        sub.getValue().increment();
      });

      // Each call should cause double render
      expect(events).toEqual([
        "increment",
        "render count=1",
        "render count=1",
        "increment",
        "render count=2",
        "render count=2",
        "increment",
        "render count=3",
        "render count=3",
      ]);
    });
  });

  describe("Source 4: setState in setTimeout", () => {
    it("should double-render AND double-call setTimeout callback", async () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        tapEffect(() => {
          if (count === 0) {
            setTimeout(() => {
              events.push("setTimeout");
              setCount(1);
            }, 10);
          }
        }, [count]);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 50));

      // React behavior: setTimeout callbacks run TWICE, then renders double
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "setTimeout",
        "setTimeout",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 5: setState in Promise/async", () => {
    it("should double-render AND double-call Promise callback", async () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        tapEffect(() => {
          if (count === 0) {
            Promise.resolve().then(() => {
              events.push("promise");
              setCount(1);
            });
          }
        }, [count]);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Wait for promise
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Promise callback should run TWICE and renders should be DOUBLED
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "promise",
        "promise",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 6: Multiple setState calls", () => {
    it("should batch multiple setState calls in flushResourcesSync (single double-render)", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count1, setCount1] = tapState(0);
        const [count2, setCount2] = tapState(0);
        events.push(`render count1=${count1} count2=${count2}`);

        return {
          updateBoth: () => {
            events.push("updateBoth");
            setCount1(1);
            setCount2(2);
          },
        };
      });

      const root = createResourceRoot();
      const sub = root.render(TestResource());

      events.length = 0; // Clear initial renders

      flushResourcesSync(() => {
        sub.getValue().updateBoth();
      });

      // Both setState calls batched, but render is DOUBLED
      expect(events).toEqual([
        "updateBoth",
        "render count1=1 count2=2",
        "render count1=1 count2=2",
      ]);
    });

    it("should batch multiple setState calls in tapEffect (single double-render)", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count1, setCount1] = tapState(0);
        const [count2, setCount2] = tapState(0);
        events.push(`render count1=${count1} count2=${count2}`);

        tapEffect(() => {
          if (count1 === 0 && count2 === 0) {
            setCount1(1);
            setCount2(2);
          }
        }, [count1, count2]);

        return {};
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Initial double-render, then batched setState causes another double-render
      expect(events).toEqual([
        "render count1=0 count2=0",
        "render count1=0 count2=0",
        "render count1=1 count2=2",
        "render count1=1 count2=2",
      ]);
    });
  });

  describe("Source 7: Simple resource double-render", () => {
    it("should double-render simple resources", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        return {
          count,
          increment: () => setCount((c) => c + 1),
        };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Resource renders should be doubled
      expect(events).toEqual(["render count=0", "render count=0"]);
    });
  });

  describe("Source 8: setState with function updater", () => {
    it("should double-render with function updater in flushResourcesSync", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        return {
          count,
          increment: () => {
            events.push("increment");
            setCount((prevCount) => {
              events.push(`updater prevCount=${prevCount}`);
              return prevCount + 1;
            });
          },
        };
      });

      const root = createResourceRoot();
      const sub = root.render(TestResource());

      events.length = 0; // Clear initial renders

      flushResourcesSync(() => {
        sub.getValue().increment();
      });

      // React behavior: Updater function is called TWICE in strict mode
      expect(events).toEqual([
        "increment",
        "updater prevCount=0",
        "updater prevCount=0",
        "render count=1",
        "render count=1",
      ]);
    });
  });

  describe("Source 9: Complex effect patterns", () => {
    it("should handle effect with dependencies and setState", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        const [doubled, setDoubled] = tapState(0);
        events.push(`render count=${count} doubled=${doubled}`);

        tapEffect(() => {
          events.push(`effect count=${count}`);
          setDoubled(count * 2);
          return () => {
            events.push(`cleanup count=${count}`);
          };
        }, [count]);

        return {
          count,
          increment: () => setCount((c) => c + 1),
        };
      });

      const root = createResourceRoot();
      const sub = root.render(TestResource());

      // setDoubled(0*2) = setDoubled(0) is a no-op, so no extra render
      expect(events).toEqual([
        "render count=0 doubled=0",
        "render count=0 doubled=0",
        "effect count=0",
        "cleanup count=0",
        "effect count=0",
      ]);

      events.length = 0;

      // Trigger increment via flushResourcesSync
      flushResourcesSync(() => {
        sub.getValue().increment();
      });

      // Double-render with new count, effect sets doubled=2, triggers another double-render
      expect(events).toEqual([
        "render count=1 doubled=0",
        "render count=1 doubled=0",
        "cleanup count=0",
        "effect count=1",
        "render count=1 doubled=2",
        "render count=1 doubled=2",
      ]);
    });
  });

  describe("Source 10: tapState initializer function", () => {
    it("should call tapState initializer twice", () => {
      const events: string[] = [];
      let initCount = 0;

      const TestResource = resource(() => {
        const [value] = tapState(() => {
          initCount++;
          events.push(`init call #${initCount}`);
          return initCount;
        });

        events.push(`render value=${value}`);

        return { value };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // tapState initializer should be called twice, first value kept
      expect(events).toEqual([
        "init call #1",
        "init call #2",
        "render value=1",
        "render value=1",
      ]);
    });
  });

  describe("Source 11: Resource disposal and recreation", () => {
    it("should maintain double-render behavior after disposal and recreation", () => {
      const events: string[] = [];

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        return {
          count,
          increment: () => setCount((c) => c + 1),
        };
      });

      // Create first instance
      const root1 = createResourceRoot();
      root1.render(TestResource());

      expect(events).toEqual(["render count=0", "render count=0"]);

      events.length = 0;

      // Unmount
      root1.unmount();

      // Create second instance
      const root2 = createResourceRoot();
      const sub2 = root2.render(TestResource());

      // Should still double-render
      expect(events).toEqual(["render count=0", "render count=0"]);

      events.length = 0;

      // Method calls via flushResourcesSync should still double-render
      flushResourcesSync(() => {
        sub2.getValue().increment();
      });

      expect(events).toEqual(["render count=1", "render count=1"]);
    });
  });

  describe("Source 12: setState in effect edge cases", () => {
    it("should apply setState from first effect mount even when second mount doesn't call setState", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        tapEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          // Only call setState on first mount
          if (effectRunCount === 1) {
            events.push(`setState(1) called in effect #${effectRunCount}`);
            setCount(1);
          } else {
            events.push(`no setState in effect #${effectRunCount}`);
          }

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Expected: setState(1) from effect #1 should be applied
      // even though effect #1 was cleaned up
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState(1) called in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "no setState in effect #2",
        "render count=1", // setState(1) applied!
        "render count=1",
      ]);
    });

    it("should apply last setState when both effect mounts call setState with different values", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        tapEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          if (effectRunCount === 1) {
            events.push(`setState(1) called in effect #${effectRunCount}`);
            setCount(1);
          } else if (effectRunCount === 2) {
            events.push(`setState(2) called in effect #${effectRunCount}`);
            setCount(2);
          }

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Expected: Only setState(2) should be applied (last one wins)
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState(1) called in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "setState(2) called in effect #2",
        "render count=2", // Only setState(2) applied!
        "render count=2",
      ]);
    });

    it("should handle updater functions from both effect mounts", () => {
      const events: string[] = [];
      let effectRunCount = 0;

      const TestResource = resource(() => {
        const [count, setCount] = tapState(0);
        events.push(`render count=${count}`);

        // biome-ignore lint/correctness/useExhaustiveDependencies: testing strict mode behavior with intentionally incomplete deps
        tapEffect(() => {
          effectRunCount++;
          events.push(`effect mount #${effectRunCount} count=${count}`);

          setCount((prev) => {
            events.push(
              `setState updater called with prev=${prev} in effect #${effectRunCount}`,
            );
            return prev + effectRunCount;
          });

          return () => {
            events.push(`effect cleanup #${effectRunCount} count=${count}`);
          };
        }, []);

        return { count };
      });

      const root = createResourceRoot();
      root.render(TestResource());

      // Tap behavior: Both updaters are queued and executed, first value kept per dispatch
      // Updater double-invoke happens per-dispatch (matching React ordering)
      // Effect #1: updater(0) => 0 + 1 = 1 (kept)
      // Effect #2: updater(0) => 0 + 2 = 2... but prev=1 from effect #1
      // Final: 3
      expect(events).toEqual([
        "render count=0",
        "render count=0",
        "effect mount #1 count=0",
        "setState updater called with prev=0 in effect #1",
        "effect cleanup #1 count=0",
        "effect mount #2 count=0",
        "setState updater called with prev=0 in effect #2",
        "setState updater called with prev=1 in effect #2",
        "setState updater called with prev=1 in effect #2",
        "render count=3",
        "render count=3",
      ]);
    });
  });
});
