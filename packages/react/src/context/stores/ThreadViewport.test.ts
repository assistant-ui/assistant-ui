import { describe, expect, it, onTestFinished, vi } from "vitest";
import { makeThreadViewportStore } from "./ThreadViewport";

describe("makeThreadViewportStore", () => {
  it("notifies every scroll listener when one throws", () => {
    const store = makeThreadViewportStore();
    const listenerError = new Error("scroll listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const laterListener = vi.fn();

    store.getState().onScrollToBottom(() => {
      throw listenerError;
    });
    store.getState().onScrollToBottom((config) => {
      config.behavior = "smooth";
    });
    store.getState().onScrollToBottom(laterListener);

    expect(() => store.getState().scrollToBottom()).not.toThrow();
    expect(laterListener).toHaveBeenCalledWith({ behavior: "auto" });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Thread viewport"),
      listenerError,
    );
  });
});
