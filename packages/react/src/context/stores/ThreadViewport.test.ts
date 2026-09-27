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

  it("delegates pauseAutoScroll to onPauseAutoScroll listeners and calls returned unsubscribes", () => {
    const outerStore = makeThreadViewportStore();
    const innerUnsub = vi.fn();
    const pauseListener = vi.fn(() => innerUnsub);

    const unsubListener = outerStore
      .getState()
      .onPauseAutoScroll(pauseListener);

    const release = outerStore.getState().pauseAutoScroll();
    expect(pauseListener).toHaveBeenCalledTimes(1);
    expect(innerUnsub).not.toHaveBeenCalled();

    release();
    expect(innerUnsub).toHaveBeenCalledTimes(1);

    unsubListener();
  });

  it("delegates resumeAutoScroll to onResumeAutoScroll listeners", () => {
    const outerStore = makeThreadViewportStore();
    const resumeListener = vi.fn();

    outerStore.getState().onResumeAutoScroll(resumeListener);
    outerStore.getState().resumeAutoScroll();

    expect(resumeListener).toHaveBeenCalledTimes(1);
  });

  it("registers pre-existing pause holders when onPauseAutoScroll is registered", () => {
    const outerStore = makeThreadViewportStore();
    const innerUnsub = vi.fn();
    const pauseListener = vi.fn(() => innerUnsub);

    // Pause before inner store registers
    const releaseLocal = outerStore.getState().pauseAutoScroll();

    // Inner store registers - should automatically receive a pause call
    const unsubListener = outerStore
      .getState()
      .onPauseAutoScroll(pauseListener);
    expect(pauseListener).toHaveBeenCalledTimes(1);

    // Unregistering the listener cleans up the existing pause release
    unsubListener();
    expect(innerUnsub).toHaveBeenCalledTimes(1);

    releaseLocal();
  });
});
