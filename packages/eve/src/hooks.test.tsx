// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { extrasRef } = vi.hoisted(() => ({
  extrasRef: { current: undefined as unknown },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    selector({
      thread: { extras: extrasRef.current },
    })) as typeof import("@assistant-ui/store").useAuiState,
  useAui: (() => ({
    thread: { getState: () => ({ extras: extrasRef.current }) },
  })) as unknown as typeof import("@assistant-ui/store").useAui,
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

describe("useEveError", () => {
  it("reads the session error from the runtime extras", () => {
    const error = new Error("boom");
    extrasRef.current = provideExtras({ error });

    expect(renderHook(() => useEveError()).result.current).toBe(error);
  });

  it("falls back to undefined outside an Eve runtime", () => {
    expect(renderHook(() => useEveError()).result.current).toBeUndefined();
  });
});

describe("useEveSession", () => {
  it("reads the session cursor from the runtime extras", () => {
    const session = {
      sessionId: "s1",
    } as unknown as EveRuntimeExtras["session"];
    extrasRef.current = provideExtras({ session });

    expect(renderHook(() => useEveSession()).result.current).toBe(session);
  });

  it("falls back to undefined outside an Eve runtime", () => {
    expect(renderHook(() => useEveSession()).result.current).toBeUndefined();
  });
});

describe("useEveEvents", () => {
  it("reads the server event stream from the runtime extras", () => {
    const events = [
      { type: "session.started" },
    ] as unknown as EveRuntimeExtras["events"];
    extrasRef.current = provideExtras({ events });

    expect(renderHook(() => useEveEvents()).result.current).toBe(events);
  });

  it("falls back to an empty array outside an Eve runtime", () => {
    expect(renderHook(() => useEveEvents()).result.current).toEqual([]);
  });

  it("returns a frozen fallback that consumers cannot mutate", () => {
    const first = renderHook(() => useEveEvents()).result.current;
    const second = renderHook(() => useEveEvents()).result.current;

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => (first as unknown[]).push({})).toThrow();
    expect(renderHook(() => useEveEvents()).result.current).toEqual([]);
  });
});

describe("useEveReset", () => {
  it("invokes reset on the runtime extras", () => {
    const reset = vi.fn();
    extrasRef.current = provideExtras({ reset });

    renderHook(() => useEveReset()).result.current();

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("throws outside an Eve runtime", () => {
    expect(() => renderHook(() => useEveReset()).result.current()).toThrow(
      "useEveAgentRuntime",
    );
  });
});
