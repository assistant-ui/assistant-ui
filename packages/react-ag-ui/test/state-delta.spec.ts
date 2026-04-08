import { describe, it, expect, vi } from "vitest";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";

describe("STATE_DELTA handling", () => {
  it("should apply JSON patch to state snapshot", () => {
    const notifyUpdate = vi.fn();
    const core = new AgUiThreadRuntimeCore({
      agent: {} as any,
      logger: { debug: undefined, error: undefined },
      showThinking: false,
      notifyUpdate,
    });

    (core as any).handleEvent(
      { handle: vi.fn() },
      { type: "STATE_SNAPSHOT", snapshot: { count: 0, name: "test" } },
    );

    (core as any).handleEvent(
      { handle: vi.fn() },
      {
        type: "STATE_DELTA",
        delta: [{ op: "replace", path: "/count", value: 42 }],
      },
    );

    expect((core as any).stateSnapshot).toEqual({ count: 42, name: "test" });
    expect(notifyUpdate).toHaveBeenCalledTimes(2);
  });
});
