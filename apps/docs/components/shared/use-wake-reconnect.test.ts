// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeReconnect, type WakeConnection } from "./use-wake-reconnect";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const connection = (
  status: string,
  reason?: string,
): WakeConnection & { reconnect: ReturnType<typeof vi.fn<() => void>> } => ({
  status,
  ...(reason !== undefined && { reason }),
  reconnect: vi.fn<() => void>(),
});

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });

describe("useWakeReconnect", () => {
  it.each(["visibilitychange", "resume"])(
    "reconnects a retrying session on %s",
    (event) => {
      setVisibility("visible");
      const retrying = connection("retrying");
      renderHook(() => useWakeReconnect(retrying));
      document.dispatchEvent(new Event(event));
      expect(retrying.reconnect).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["online", "focus"])("reconnects an idle session on %s", (event) => {
    setVisibility("visible");
    const idle = connection("standby", "idle");
    renderHook(() => useWakeReconnect(idle));
    window.dispatchEvent(new Event(event));
    expect(idle.reconnect).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["connected", undefined],
    ["connecting", undefined],
    ["standby", "deferred"],
    ["stopped", undefined],
  ])("leaves a %s session alone", (status, reason) => {
    setVisibility("visible");
    const other = connection(status, reason);
    renderHook(() => useWakeReconnect(other));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    expect(other.reconnect).not.toHaveBeenCalled();
  });

  it("waits until the page is visible", () => {
    setVisibility("hidden");
    const retrying = connection("retrying");
    renderHook(() => useWakeReconnect(retrying));
    window.dispatchEvent(new Event("online"));
    expect(retrying.reconnect).not.toHaveBeenCalled();
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(retrying.reconnect).toHaveBeenCalledTimes(1);
  });

  it("stops listening when unmounted", () => {
    setVisibility("visible");
    const retrying = connection("retrying");
    const { unmount } = renderHook(() => useWakeReconnect(retrying));
    unmount();
    window.dispatchEvent(new Event("focus"));
    expect(retrying.reconnect).not.toHaveBeenCalled();
  });
});
