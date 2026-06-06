/* oxlint-disable tap-hooks/exhaustive-deps -- tests deliberately exercise invalid dep arrays */
import { describe, it, expect, vi } from "vitest";
import { useEffect } from "../../hooks/useEffect";
import { useState } from "../../hooks/useState";
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
      const [dep, _setDep] = useState(1);
      setDep = _setDep;

      useEffect(effect, [dep]);
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
      const [count, setCount] = useState(0);
      const [dep] = useState("constant");
      triggerRerender = setCount;

      useEffect(effect, [dep]);
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
      const [dep, _setDep] = useState(1);
      setDep = _setDep;

      useEffect(() => {
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
      const [count, setCount] = useState(0);
      triggerRerender = setCount;

      useEffect(effect); // No deps = always re-run
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
      const [count, setCount] = useState(0);
      triggerRerender = setCount;

      useEffect(effect, []); // Empty deps = run once
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
      const [dep1, _setDep1] = useState("a");
      const [dep2, _setDep2] = useState(1);
      setDep1 = _setDep1;
      setDep2 = _setDep2;

      useEffect(effect, [dep1, dep2]);
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
      const [obj, _setObj] = useState({ value: 1 });
      setObj = _setObj;

      useEffect(effect, [obj]);
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
      const [value, _setValue] = useState(NaN);
      setValue = _setValue;

      useEffect(effect, [value]);
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
        useEffect(() => {}, [1]);
      } else {
        useEffect(() => {}); // No deps
      }
      return null;
    });

    renderTest(resource, undefined);

    // Change to no deps
    useDeps = false;

    // Error throws during render (fail-fast validation)
    expect(() => renderResourceFiber(resource, undefined)).toThrow(
      "useEffect called with and without dependencies across re-renders",
    );
  });
});
