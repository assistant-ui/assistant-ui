import { describe, it, expect, afterEach } from "vitest";
import { tapEffect } from "../../hooks/tap-effect";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
} from "../test-utils";
import { setTapInstrumentation } from "../../core/debug";

describe("tap instrumentation", () => {
  afterEach(() => {
    setTapInstrumentation(null);
    cleanupAllResources();
  });

  it("calls instrumentation hooks during render and commit lifecycle", () => {
    const calls: string[] = [];

    setTapInstrumentation({
      onRenderStart: () => calls.push("render:start"),
      onRenderEnd: () => calls.push("render:end"),
      onCommitStart: () => calls.push("commit:start"),
      onCommitEnd: () => calls.push("commit:end"),
      onEffectRunStart: () => calls.push("effect:run:start"),
      onEffectRunEnd: () => calls.push("effect:run:end"),
    });

    const fiber = createTestResource(() => {
      tapEffect(() => {});
      return 42;
    });

    const result = renderTest(fiber, undefined);

    expect(result).toBe(42);

    expect(calls).toEqual([
      "render:start",
      "render:end",
      "commit:start",
      "effect:run:start:0",
      "effect:run:end:0",
      "commit:end",
    ]);
  });

  it("calls cleanup instrumentation when resource is unmounted", () => {
    const calls: string[] = [];

    setTapInstrumentation({
      onEffectCleanupStart: () => calls.push("cleanup:start"),
      onEffectCleanupEnd: () => calls.push("cleanup:end"),
    });

    const fiber = createTestResource(() => {
      tapEffect(() => {
        return () => {};
      });
      return "ok";
    });

    renderTest(fiber, undefined);
    cleanupAllResources();

    expect(calls).toEqual(["cleanup:start", "cleanup:end"]);
  });
});
