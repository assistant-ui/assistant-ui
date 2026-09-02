// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useAuiEvent } from "../useAuiEvent";

afterEach(() => {
  vi.restoreAllMocks();
});

const useCounterClient = () => {
  const [count, setCount] = useState(1);
  return {
    getState: () => ({ count }),
    setCount: (value: number) => setCount(value),
  };
};
const CounterClient = resource(useCounterClient);

const useStableCounterClient = () => {
  const [, setVersion] = useState(0);
  const stateRef = useRef({ count: 1 });
  return useMemo(
    () => ({
      getState: () => stateRef.current,
      setCount: (count: number) => {
        stateRef.current = { count };
        setVersion((version) => version + 1);
      },
    }),
    [setVersion],
  );
};
const StableCounterClient = resource(useStableCounterClient);

class CounterState {
  constructor(count: number) {
    Object.defineProperty(this, "count", { value: count });
  }

  declare readonly count: number;
}

const useClassStateCounterClient = () => {
  const [count, setCount] = useState(1);
  return {
    getState: () => new CounterState(count),
    setCount,
  };
};
const ClassStateCounterClient = resource(useClassStateCounterClient);

const createRealClientWrapper = () => {
  let aui!: Record<string, any>;
  const wrapper = ({ children }: { children: ReactNode }) => {
    const client = useAui({
      counter: CounterClient(),
    } as unknown as useAui.Props);
    aui = client;
    return <AuiProvider value={client}>{children}</AuiProvider>;
  };
  return { wrapper, getAui: () => aui };
};

type Listener = () => void;
type EventEntry = {
  selector: { scope: string; event: string };
  callback: (payload: unknown) => void;
};

const createHandBuiltClient = () => {
  const listeners = new Set<Listener>();
  const eventEntries: EventEntry[] = [];

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
  } as const;

  return {
    client,
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
    const { wrapper, getAui } = createRealClientWrapper();

    const { result } = renderHook(
      () => useAuiState((s: any) => s.counter.count),
      { wrapper },
    );
    expect(result.current).toBe(1);

    act(() => {
      flushTapSync(() => getAui().counter.setCount(2));
    });

    expect(result.current).toBe(2);
  });

  it("useAuiState updates when client methods keep the same identity", () => {
    let aui!: Record<string, any>;
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        counter: StableCounterClient(),
      } as unknown as useAui.Props);
      aui = client;
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }

    const { result } = renderHook(
      () => useAuiState((state: any) => state.counter.count),
      { wrapper: Wrapper },
    );

    act(() => {
      flushTapSync(() => aui.counter.setCount(2));
    });

    expect(result.current).toBe(2);
  });

  it("useAuiState updates for non-plain client state", () => {
    let aui!: Record<string, any>;
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        counter: ClassStateCounterClient(),
      } as unknown as useAui.Props);
      aui = client;
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }

    const { result } = renderHook(
      () => useAuiState((state: any) => state.counter.count),
      { wrapper: Wrapper },
    );

    act(() => {
      flushTapSync(() => aui.counter.setCount(2));
    });

    expect(result.current).toBe(2);
  });

  it("useAuiState only evaluates selectors for scopes that changed", () => {
    let aui!: Record<string, any>;
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        counter: CounterClient(),
        other: CounterClient(),
      } as unknown as useAui.Props);
      aui = client;
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }
    const selector = vi.fn((state: any) => state.counter.count);

    const { result } = renderHook(() => useAuiState(selector), {
      wrapper: Wrapper,
    });
    selector.mockClear();

    act(() => {
      flushTapSync(() => aui.other.setCount(2));
    });
    expect(selector).not.toHaveBeenCalled();

    act(() => {
      flushTapSync(() => aui.counter.setCount(3));
    });
    expect(result.current).toBe(3);

    selector.mockClear();
    act(() => {
      flushTapSync(() => aui.other.setCount(4));
    });
    expect(selector).not.toHaveBeenCalled();
  });

  it("useAuiState throws when selector returns full state", () => {
    const { wrapper } = createRealClientWrapper();

    expect(() => {
      renderHook(() => useAuiState((s: any) => s), { wrapper });
    }).toThrow(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  });

  it("useAuiState receives a state proxy even for hand-built clients", () => {
    const { client } = createHandBuiltClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={client as never}>{children}</AuiProvider>
    );

    const { result } = renderHook(() => useAuiState((s) => typeof s), {
      wrapper,
    });

    expect(result.current).toBe("object");
  });

  it("useAuiEvent subscribes with normalized selector and invokes latest callback", () => {
    const testClient = createHandBuiltClient();
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
