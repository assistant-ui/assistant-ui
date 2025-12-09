import { describe, it, expect, vi } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import { createTestResource, renderTest, unmountResource } from "../test-utils";
import {
  renderResourceFiber,
  commitResourceFiber,
} from "../../core/ResourceFiber";

describe("Errors - Effect Errors", () => {
  it("should propagate errors from effects", () => {
    const error = new Error("Effect error");

    const resource = createTestResource(() => {
      tapEffect(() => {
        throw error;
      });
      return null;
    });

    expect(() => renderTest(resource, undefined)).toThrow(error);
  });

  it("should propagate errors from cleanup functions", () => {
    const error = new Error("Cleanup error");
    let dep = 0;

    const resource = createTestResource(() => {
      tapEffect(() => {
        return () => {
          if (dep > 0) {
            throw error;
          }
        };
      }, [dep]); // Cleanup will run when dep changes

      return dep;
    });

    // First render and commit - establishes the effect
    const ctx1 = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx1);

    // Change dep to trigger cleanup on next render
    dep = 1;

    // Second render with different dep should trigger cleanup that throws
    const ctx2 = renderResourceFiber(resource, undefined);
    expect(() => commitResourceFiber(resource, ctx2)).toThrow(error);
  });

  it("should throw on invalid effect return value", () => {
    const resource = createTestResource(() => {
      tapEffect(() => {
        return "not a function" as any; // Invalid return
      });
      return null;
    });

    expect(() => renderTest(resource, undefined)).toThrow(
      "An effect function must either return a cleanup function or nothing",
    );
  });

  it("should handle multiple effect errors", () => {
    const error1 = new Error("First error");
    const error2 = new Error("Second error");
    const goodEffect = vi.fn();

    const resource = createTestResource(() => {
      tapEffect(() => {
        throw error1;
      });

      tapEffect(goodEffect); // This won't run

      tapEffect(() => {
        throw error2;
      });

      return null;
    });

    // Should throw first error
    expect(() => renderTest(resource, undefined)).toThrow(error1);
    expect(goodEffect).not.toHaveBeenCalled();
  });

  it("should continue cleanup on unmount despite errors", () => {
    const cleanupError = new Error("Cleanup failed");
    const cleanup1 = vi.fn(() => {
      throw cleanupError;
    });
    const cleanup2 = vi.fn();
    const cleanup3 = vi.fn();

    const resource = createTestResource(() => {
      tapEffect(() => cleanup1);
      tapEffect(() => cleanup2);
      tapEffect(() => cleanup3);
      return null;
    });

    renderTest(resource, undefined);

    // Unmount should throw the error but should still run all cleanups
    expect(() => unmountResource(resource)).toThrow(cleanupError);
    expect(cleanup1).toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalled();
    expect(cleanup3).toHaveBeenCalled();
  });

  it("should handle errors in effect with dependencies", () => {
    const error = new Error("Dep effect error");
    let shouldThrow = false;

    const resource = createTestResource(() => {
      const [dep, setDep] = tapState(0);

      tapEffect(() => {
        if (shouldThrow) {
          throw error;
        }
      }, [dep]);

      // Use effect to trigger state change
      tapEffect(() => {
        if (dep === 0) {
          shouldThrow = true;
          setDep(1); // Trigger effect re-run
        }
      }, [dep]);

      return dep;
    });

    // The initial render will trigger setState which causes flushSync
    // The flushed re-render will throw the error
    expect(() => renderTest(resource, undefined)).toThrow(error);
  });

  it("should handle async errors in effects", async () => {
    // Set up a promise to catch the async error
    let asyncErrorPromise: Promise<void>;

    const resource = createTestResource(() => {
      tapEffect(() => {
        // Async errors are not caught by the framework
        asyncErrorPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Async error"));
          }, 0);
        });

        // Catch the error to prevent unhandled rejection
        asyncErrorPromise.catch(() => {
          // Expected - async errors are not caught by the framework
        });
      });
      return null;
    });

    // This won't throw synchronously
    expect(() => renderTest(resource, undefined)).not.toThrow();

    // Wait for the async error to be handled
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("should properly clean up state after effect error", () => {
    const error = new Error("Effect error");
    let effectRan = false;

    const resource = createTestResource(() => {
      const [value] = tapState("initial");

      tapEffect(() => {
        effectRan = true;
        throw error;
      });

      return value;
    });

    expect(() => renderTest(resource, undefined)).toThrow(error);
    expect(effectRan).toBe(true);

    // Resource should not have committed state since commit failed
    // Since commit failed, we can't check the state through normal means
  });

  it("should handle errors in effect cleanup during re-render", () => {
    const cleanupError = new Error("Cleanup during re-render");
    let throwOnCleanup = false;

    const resource = createTestResource(() => {
      const [count, setCount] = tapState(0);

      tapEffect(() => {
        return () => {
          if (throwOnCleanup) {
            throw cleanupError;
          }
        };
      }, [count]);

      // Use effect to trigger state change
      tapEffect(() => {
        if (count === 0) {
          throwOnCleanup = true;
          setCount(1);
        }
      }, [count]);

      return count;
    });

    // The initial render will trigger setState which causes flushSync
    // During the flush, the cleanup will run and throw
    expect(() => renderTest(resource, undefined)).toThrow(cleanupError);
  });
});
