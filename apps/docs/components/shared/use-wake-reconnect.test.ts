// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StatewireClient } from "statewire";
import { useWakeReconnect, type WakeConnection } from "./use-wake-reconnect";

afterEach(cleanup);

type Lifecycle = StatewireClient.ConnectionState;
const connection = (lifecycle: Lifecycle) => {
  const reconnect = vi.fn<() => void>();
  return {
    connection: { ...lifecycle, reconnect } as WakeConnection,
    reconnect,
  };
};
const retrying: Lifecycle = { status: "retrying", degraded: true, attempt: 1 };
const idle: Lifecycle = { status: "standby", reason: "idle", degraded: false };

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
      const wire = connection(retrying);
      renderHook(() => useWakeReconnect(wire.connection));
      document.dispatchEvent(new Event(event));
      expect(wire.reconnect).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["online", "focus"])("reconnects an idle session on %s", (event) => {
    setVisibility("visible");
    const wire = connection(idle);
    renderHook(() => useWakeReconnect(wire.connection));
    window.dispatchEvent(new Event(event));
    expect(wire.reconnect).toHaveBeenCalledTimes(1);
  });

  const untouched: Lifecycle[] = [
    { status: "connected", degraded: false },
    { status: "connecting", degraded: false },
    { status: "standby", reason: "deferred", degraded: false },
    { status: "stopped", degraded: true, reason: "gone" },
  ];
  it.each(untouched)("leaves a $status session alone", (lifecycle) => {
    setVisibility("visible");
    const wire = connection(lifecycle);
    renderHook(() => useWakeReconnect(wire.connection));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    expect(wire.reconnect).not.toHaveBeenCalled();
  });

  it("waits until the page is visible", () => {
    setVisibility("hidden");
    const wire = connection(retrying);
    renderHook(() => useWakeReconnect(wire.connection));
    window.dispatchEvent(new Event("online"));
    expect(wire.reconnect).not.toHaveBeenCalled();
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(wire.reconnect).toHaveBeenCalledTimes(1);
  });

  it("stops listening when unmounted", () => {
    setVisibility("visible");
    const wire = connection(retrying);
    const { unmount } = renderHook(() => useWakeReconnect(wire.connection));
    unmount();
    window.dispatchEvent(new Event("focus"));
    expect(wire.reconnect).not.toHaveBeenCalled();
  });
});
