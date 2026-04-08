import { describe, it, expect, vi } from "vitest";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";

function createCore(
  options: {
    onCustomEvent?: (event: { name: string; value: unknown }) => void;
  } = {},
) {
  return new AgUiThreadRuntimeCore({
    agent: {} as any,
    logger: { debug: undefined, error: undefined },
    showThinking: false,
    notifyUpdate: () => {},
    ...options,
  });
}

describe("onCustomEvent", () => {
  it("should forward CUSTOM events to the callback", () => {
    const onCustomEvent = vi.fn();
    const core = createCore({ onCustomEvent });

    (core as any).handleEvent(
      { handle: vi.fn() },
      {
        type: "CUSTOM",
        name: "a2ui:createSurface",
        value: { surfaceId: "s1" },
      },
    );

    expect(onCustomEvent).toHaveBeenCalledWith({
      name: "a2ui:createSurface",
      value: { surfaceId: "s1" },
    });
  });

  it("should not crash when no callback is provided", () => {
    const core = createCore();
    const mockAggregator = { handle: vi.fn() };

    expect(() => {
      (core as any).handleEvent(mockAggregator, {
        type: "CUSTOM",
        name: "test",
        value: null,
      });
    }).not.toThrow();

    expect(mockAggregator.handle).not.toHaveBeenCalled();
  });
});
