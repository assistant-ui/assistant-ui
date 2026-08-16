// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { extrasRef } = vi.hoisted(() => ({
  extrasRef: { current: undefined as unknown },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: (() => ({
    thread: { getState: () => ({ extras: extrasRef.current }) },
  })) as unknown as typeof import("@assistant-ui/store").useAui,
  useAuiState: ((selector: (s: unknown) => unknown) =>
    selector({
      thread: { extras: extrasRef.current },
    })) as typeof import("@assistant-ui/store").useAuiState,
}));

import { eveExtras, type EveRuntimeExtras } from "./eveExtras";
import { useEveError, useEveEvents, useEveReset, useEveSession } from "./hooks";

const provideExtras = (over: Partial<EveRuntimeExtras>) =>
  eveExtras.provide({
    error: undefined,
    events: [],
    session: {} as EveRuntimeExtras["session"],
    reset: () => {},
    ...over,
  });

afterEach(() => {
  extrasRef.current = undefined;
});

describe("Eve accessor hooks", () => {
  it("reads the session error from the runtime extras", () => {
    const error = new Error("boom");
    extrasRef.current = provideExtras({ error });

    expect(renderHook(() => useEveError()).result.current).toBe(error);
  });

  it("reads the session cursor from the runtime extras", () => {
    const session = {
      sessionId: "s1",
    } as unknown as EveRuntimeExtras["session"];
    extrasRef.current = provideExtras({ session });

    expect(renderHook(() => useEveSession()).result.current).toBe(session);
  });

  it("reads the server event stream from the runtime extras", () => {
    const events = [
      { type: "session.started" },
    ] as unknown as EveRuntimeExtras["events"];
    extrasRef.current = provideExtras({ events });

    expect(renderHook(() => useEveEvents()).result.current).toBe(events);
  });

  it("reads reset from the runtime extras", () => {
    const reset = vi.fn();
    extrasRef.current = provideExtras({ reset });

    renderHook(() => useEveReset()).result.current();

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("supplies fallbacks outside an Eve runtime, and defers the reset throw to invocation", () => {
    expect(renderHook(() => useEveError()).result.current).toBeUndefined();
    expect(renderHook(() => useEveSession()).result.current).toBeUndefined();

    const events = renderHook(() => useEveEvents()).result.current;
    expect(events).toEqual([]);
    expect(renderHook(() => useEveEvents()).result.current).toBe(events);
    expect(Object.isFrozen(events)).toBe(true);

    const reset = renderHook(() => useEveReset()).result.current;
    expect(() => reset()).toThrow("useEveAgentRuntime");
  });
});
