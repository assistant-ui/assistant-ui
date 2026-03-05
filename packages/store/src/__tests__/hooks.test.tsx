// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAuiState } from "../useAuiState";
import { useShallow } from "../useShallow";
import { useAuiEvent } from "../useAuiEvent";
import { PROXIED_ASSISTANT_STATE_SYMBOL } from "../utils/proxied-assistant-state";

afterEach(() => {
  vi.restoreAllMocks();
});

type Listener = () => void;
type EventEntry = {
  selector: { scope: string; event: string };
  callback: (payload: unknown) => void;
};

const createTestAuiClient = (initialState: Record<string, unknown>) => {
  const listeners = new Set<Listener>();
  const eventEntries: EventEntry[] = [];
  const state = initialState;

  const client = {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on: (
      selector: { scope: string; event: string },
      callback: (payload: unknown) => void,
    ) => {
      eventEntries.push({ selector, callback });
      return () => {
        const idx = eventEntries.findIndex(
          (entry) => entry.callback === callback,
        );
        if (idx >= 0) eventEntries.splice(idx, 1);
      };
    },
    [PROXIED_ASSISTANT_STATE_SYMBOL]: state,
  } as const;

  return {
    client,
    state,
    notify: () => listeners.forEach((listener) => listener()),
    emitEvent: (event: string, payload: unknown) => {
      for (const entry of eventEntries) {
        if (entry.selector.event === event) {
          entry.callback(payload);
        }
      }
    },
    getEventEntries: () => eventEntries.slice(),
  };
};

describe("store hooks", () => {
  it("useAuiState subscribes and updates selected state", () => {
    const testClient = createTestAuiClient({ counter: 1 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const { result } = renderHook(() => useAuiState((s: any) => s.counter), {
      wrapper,
    });
    expect(result.current).toBe(1);

    act(() => {
      testClient.state.counter = 2;
      testClient.notify();
    });

    expect(result.current).toBe(2);
  });

  it("useAuiState throws when selector returns full state", () => {
    const testClient = createTestAuiClient({ counter: 1 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    expect(() => {
      renderHook(() => useAuiState((s: any) => s), { wrapper });
    }).toThrow(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  });

  it("useAuiState with useShallow prevents re-renders for shallow-equal objects", () => {
    const testClient = createTestAuiClient({ a: 1, b: 2 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const selector = vi.fn((s: any) => ({ a: s.a, b: s.b }));

    const { result } = renderHook(() => useAuiState(useShallow(selector)), {
      wrapper,
    });

    expect(result.current).toEqual({ a: 1, b: 2 });
    const firstResult = result.current;

    // Notify without changing values — should return same reference
    act(() => {
      testClient.notify();
    });

    expect(result.current).toBe(firstResult);

    // Change a value — should return new reference
    act(() => {
      testClient.state.a = 99;
      testClient.notify();
    });

    expect(result.current).toEqual({ a: 99, b: 2 });
    expect(result.current).not.toBe(firstResult);
  });

  it("useAuiState warns in dev when selector returns unstable objects", () => {
    const testClient = createTestAuiClient({ x: 1 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // The unstable selector also causes React's "Maximum update depth" error
    // because useSyncExternalStore keeps re-rendering. We just verify our
    // warning was emitted before React's error kicks in.
    try {
      renderHook(() => useAuiState((s: any) => ({ x: s.x })), { wrapper });
    } catch {
      // expected — React throws due to infinite re-render loop
    }

    const ourWarning = errorSpy.mock.calls.find((args) =>
      String(args[0]).includes(
        "useAuiState: Your selector returns a new object on every call",
      ),
    );
    expect(ourWarning).toBeDefined();
  });

  it("useAuiState does not warn when selector returns a primitive", () => {
    const testClient = createTestAuiClient({ x: 42 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useAuiState((s: any) => s.x), { wrapper });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("useAuiState does not warn when useShallow is used", () => {
    const testClient = createTestAuiClient({ x: 1 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useAuiState(useShallow((s: any) => ({ x: s.x }))), {
      wrapper,
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("useAuiEvent subscribes with normalized selector and invokes latest callback", () => {
    const testClient = createTestAuiClient({ counter: 1 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useAuiEvent("thread.updated" as any, cb as any),
      {
        wrapper,
        initialProps: { cb: firstCallback },
      },
    );

    const [entry] = testClient.getEventEntries();
    expect(entry?.selector).toEqual({
      scope: "thread",
      event: "thread.updated",
    });

    rerender({ cb: secondCallback });

    act(() => {
      testClient.emitEvent("thread.updated", { id: "t-1" });
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith({ id: "t-1" });
  });
});
