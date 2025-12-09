import { describe, it, expect, vi } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import { tapState } from "../../hooks/tap-state";
import { createTestResource, renderTest, waitForNextTick } from "../test-utils";
import {
  renderResourceFiber,
  commitResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";

describe("Lifecycle - Dependencies", () => {
  it("should re-run effect when deps change", async () => {
    const effect = vi.fn();
    let setDep: any;

    const resource = createTestResource(() => {
      const [dep, _setDep] = tapState(1);
      setDep = _setDep;

      tapEffect(effect, [dep]);
      return dep;
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Change dependency - this triggers automatic re-render
    setDep(2);

    // Wait for scheduled re-render
    await waitForNextTick();
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("should not re-run effect when deps are same", async () => {
    const effect = vi.fn();
    let triggerRerender: any;

    const resource = createTestResource(() => {
      const [count, setCount] = tapState(0);
      const [dep] = tapState("constant");
      triggerRerender = setCount;

      tapEffect(effect, [dep]);
      return { count, dep };
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Trigger re-render without changing dep
    triggerRerender(1);

    // Wait for scheduled re-render
    await waitForNextTick();
    expect(effect).toHaveBeenCalledTimes(1); // Should not re-run
  });

  it("should run cleanup before effect re-runs", () => {
    const log: string[] = [];
    let setDep: any;

    const resource = createTestResource(() => {
      const [dep, _setDep] = tapState(1);
      setDep = _setDep;

      tapEffect(() => {
        log.push(`effect-${dep}`);
        return () => log.push(`cleanup-${dep}`);
      }, [dep]);

      return dep;
    });

    renderTest(resource, undefined);
    expect(log).toEqual(["effect-1"]);

    // Change dep
    setDep(2);
    const ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);

    expect(log).toEqual(["effect-1", "cleanup-1", "effect-2"]);
  });

  it("should handle undefined deps (always re-run)", async () => {
    const effect = vi.fn();
    let triggerRerender: any;

    const resource = createTestResource(() => {
      const [count, setCount] = tapState(0);
      triggerRerender = setCount;

      tapEffect(effect); // No deps = always re-run
      return count;
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Re-render
    triggerRerender(1);

    await waitForNextTick();

    expect(effect).toHaveBeenCalledTimes(2); // Should re-run
  });

  it("should handle empty deps array (run once)", () => {
    const effect = vi.fn();
    let triggerRerender: any;

    const resource = createTestResource(() => {
      const [count, setCount] = tapState(0);
      triggerRerender = setCount;

      tapEffect(effect, []); // Empty deps = run once
      return count;
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Re-render
    triggerRerender(1);
    const ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);

    expect(effect).toHaveBeenCalledTimes(1); // Should not re-run
  });

  it("should handle multiple dependencies", () => {
    const effect = vi.fn();
    let setDep1: any, setDep2: any;

    const resource = createTestResource(() => {
      const [dep1, _setDep1] = tapState("a");
      const [dep2, _setDep2] = tapState(1);
      setDep1 = _setDep1;
      setDep2 = _setDep2;

      tapEffect(effect, [dep1, dep2]);
      return { dep1, dep2 };
    });

    // Initial render
    let ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);
    expect(effect).toHaveBeenCalledTimes(1);

    // Change first dep
    setDep1("b");
    ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);
    expect(effect).toHaveBeenCalledTimes(2);

    // Change second dep
    setDep2(2);
    ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);
    expect(effect).toHaveBeenCalledTimes(3);

    // Change both deps
    setDep1("c");
    setDep2(3);
    ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);
    expect(effect).toHaveBeenCalledTimes(4);

    unmountResourceFiber(resource);
  });

  it("should use Object.is for dependency comparison", () => {
    const effect = vi.fn();
    let setObj: any;

    const resource = createTestResource(() => {
      const [obj, _setObj] = tapState({ value: 1 });
      setObj = _setObj;

      tapEffect(effect, [obj]);
      return obj;
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Set to new object with same shape
    setObj({ value: 1 });
    const ctx = renderResourceFiber(resource, undefined);
    commitResourceFiber(resource, ctx);

    expect(effect).toHaveBeenCalledTimes(2); // Should re-run (different object)
  });

  it("should handle NaN in dependencies", () => {
    const effect = vi.fn();
    let setValue: any;

    const resource = createTestResource(() => {
      const [value, _setValue] = tapState(NaN);
      setValue = _setValue;

      tapEffect(effect, [value]);
      return value;
    });

    renderTest(resource, undefined);
    expect(effect).toHaveBeenCalledTimes(1);

    // Set to NaN again
    const ctx = renderResourceFiber(resource, undefined);
    setValue(NaN);
    commitResourceFiber(resource, ctx);

    expect(effect).toHaveBeenCalledTimes(1); // Should not re-run (NaN === NaN in Object.is)
  });

  it("should throw error when mixing deps and no-deps", () => {
    let useDeps = true;

    const resource = createTestResource(() => {
      if (useDeps) {
        tapEffect(() => {}, [1]);
      } else {
        tapEffect(() => {}); // No deps
      }
      return null;
    });

    renderTest(resource, undefined);

    // Change to no deps
    useDeps = false;
    const ctx = renderResourceFiber(resource, undefined);

    expect(() => commitResourceFiber(resource, ctx)).toThrow(
      "tapEffect called with and without dependencies across re-renders",
    );
  });
});
