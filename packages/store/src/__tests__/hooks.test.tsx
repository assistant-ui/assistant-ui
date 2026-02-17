// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAuiState } from "../useAuiState";
import { useAuiEvent } from "../useAuiEvent";
import { PROXIED_ASSISTANT_STATE_SYMBOL } from "@assistant-ui/core/store";

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
