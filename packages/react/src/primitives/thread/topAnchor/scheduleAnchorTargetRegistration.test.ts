// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scheduleAnchorTargetRegistration,
  type AnchorTargetRegistrationStore,
} from "./scheduleAnchorTargetRegistration";

const makeStore = () => {
  const unregister = vi.fn<() => void>();
  const registerAnchorTargetElement = vi.fn(() => unregister);
  const store: AnchorTargetRegistrationStore = {
    getState: () => ({
      topAnchorMessageClamp: { tallerThan: "10em", visibleHeight: "6em" },
      registerAnchorTargetElement,
    }),
  };
  return { store, registerAnchorTargetElement, unregister };
};

describe("scheduleAnchorTargetRegistration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("registers the element with parsed clamp values on the next animation frame", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const { store, registerAnchorTargetElement } = makeStore();

    scheduleAnchorTargetRegistration(el, store);

    expect(registerAnchorTargetElement).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);

    expect(registerAnchorTargetElement).toHaveBeenCalledOnce();
    const [calledEl, calledConfig] = registerAnchorTargetElement.mock.calls[0]!;
    expect(calledEl).toBe(el);
    // jsdom returns empty fontSize, parseCssLength falls back to 16. 10em = 160, 6em = 96.
    expect(calledConfig).toEqual({ tallerThan: 160, visibleHeight: 96 });
  });

  it("cancels the pending frame and never registers when cleaned up before the frame fires", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const { store, registerAnchorTargetElement, unregister } = makeStore();

    const cleanup = scheduleAnchorTargetRegistration(el, store);
    cleanup();

    vi.advanceTimersByTime(50);

    expect(registerAnchorTargetElement).not.toHaveBeenCalled();
    expect(unregister).not.toHaveBeenCalled();
  });

  it("unregisters the element when cleaned up after the frame has fired", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const { store, registerAnchorTargetElement, unregister } = makeStore();

    const cleanup = scheduleAnchorTargetRegistration(el, store);
    vi.advanceTimersByTime(20);
    expect(registerAnchorTargetElement).toHaveBeenCalledOnce();
    expect(unregister).not.toHaveBeenCalled();

    cleanup();

    expect(unregister).toHaveBeenCalledOnce();
  });

  it("does not unregister twice when cleanup is invoked multiple times", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const { store, unregister } = makeStore();

    const cleanup = scheduleAnchorTargetRegistration(el, store);
    vi.advanceTimersByTime(20);
    cleanup();
    cleanup();

    expect(unregister).toHaveBeenCalledOnce();
  });
});
