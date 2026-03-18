// @vitest-environment jsdom

import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, tapState, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { Derived } from "../Derived";
import { tapClientLookup } from "../tapClientLookup";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import type { ClientOutput } from "../types/client";

type ItemState = { id: string; value: string };

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    testList: {
      methods: {
        getState: () => { items: ItemState[]; shouldThrowBug: boolean };
        setItems: (items: ItemState[]) => void;
        setShouldThrowBug: (value: boolean) => void;
        item: (
          selector: { index: number } | { id: string },
        ) => ClientOutput<"testItem">;
      };
    };
    testItem: {
      methods: {
        getState: () => ItemState;
      };
      meta: { source: "testList"; query: { index: number } };
    };
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

const TestItemClient = resource(
  ({ item }: { item: ItemState }): ClientOutput<"testItem"> => {
    return {
      getState: () => item,
    };
  },
);

const TestListClient = resource(
  ({
    initialItems,
  }: {
    initialItems: ItemState[];
  }): ClientOutput<"testList"> => {
    const [items, setItems] = tapState(initialItems);
    const [shouldThrowBug, setShouldThrowBug] = tapState(false);

    const lookup = tapClientLookup(
      () => items.map((item) => withKey(item.id, TestItemClient({ item }))),
      [items],
    );

    return {
      getState: () => ({ items, shouldThrowBug }),
      setItems,
      setShouldThrowBug,
      item: (selector) => {
        if (shouldThrowBug) {
          throw new TypeError("bug in testList.item");
        }

        if ("id" in selector) {
          return lookup.get({ key: selector.id });
        }

        return lookup.get({ index: selector.index });
      },
    };
  },
);

const createWrapper = (initialItems: ItemState[]) => {
  let rootAui: ReturnType<typeof useAui> | null = null;

  const RootProvider = ({ children }: { children: ReactNode }) => {
    const aui = useAui({
      testList: TestListClient({ initialItems }),
    });
    rootAui = aui;
    return <AuiProvider value={aui}>{children}</AuiProvider>;
  };

  const DerivedProvider = ({ children }: { children: ReactNode }) => {
    const aui = useAui({
      testItem: Derived({
        source: "testList",
        query: { index: 0 },
        get: (aui) => aui.testList().item({ index: 0 }),
      }),
    });

    return <AuiProvider value={aui}>{children}</AuiProvider>;
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RootProvider>
      <DerivedProvider>{children}</DerivedProvider>
    </RootProvider>
  );

  return {
    wrapper,
    getRootAui: () => {
      if (!rootAui) {
        throw new Error("root aui not initialized");
      }

      return rootAui;
    },
  };
};

class TestErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.error) {
      return <div data-testid="error">{this.state.error.message}</div>;
    }

    return this.props.children;
  }
}

describe("derived scope invalidation", () => {
  it("returns the previous selector value when a real Derived scope becomes invalid", () => {
    const { wrapper, getRootAui } = createWrapper([
      { id: "a", value: "first" },
    ]);

    const { result } = renderHook(() => useAuiState((s) => s.testItem.value), {
      wrapper,
    });

    expect(result.current).toBe("first");

    act(() => {
      getRootAui().testList().setItems([]);
    });

    expect(result.current).toBe("first");
  });

  it("throws on first render when the Derived scope is initially invalid", () => {
    const { wrapper } = createWrapper([]);

    expect(() => {
      renderHook(() => useAuiState((s) => s.testItem.value), { wrapper });
    }).toThrow("tapClientLookup: Index 0 out of bounds");
  });

  it("propagates non-lookup errors after a prior successful resolution", () => {
    const { wrapper, getRootAui } = createWrapper([
      { id: "a", value: "first" },
    ]);

    const Consumer = () => {
      const value = useAuiState((s) => s.testItem.value);
      return <div data-testid="value">{value}</div>;
    };

    render(
      <TestErrorBoundary>
        {wrapper({ children: <Consumer /> })}
      </TestErrorBoundary>,
    );

    expect(screen.getByTestId("value").textContent).toBe("first");

    act(() => {
      getRootAui().testList().setShouldThrowBug(true);
    });

    return waitFor(() => {
      expect(screen.getByTestId("error").textContent).toContain(
        "bug in testList.item",
      );
    });
  });

  it("continues updating normally when the derived scope stays valid", () => {
    const { wrapper, getRootAui } = createWrapper([
      { id: "a", value: "first" },
    ]);

    const { result } = renderHook(() => useAuiState((s) => s.testItem.value), {
      wrapper,
    });

    expect(result.current).toBe("first");

    act(() => {
      getRootAui()
        .testList()
        .setItems([{ id: "b", value: "updated" }]);
    });

    return waitFor(() => {
      expect(result.current).toBe("updated");
    });
  });
});
