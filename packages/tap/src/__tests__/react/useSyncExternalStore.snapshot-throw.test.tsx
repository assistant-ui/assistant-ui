import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { resource } from "../../core/resource";
import { useResource } from "../../hooks/useResource";
import { useSyncExternalStore } from "../../react-hooks/useSyncExternalStore";
import { useCallback } from "../../react-hooks/useCallback";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { waitForNextTick } from "../test-utils";

const createStore = (initial: string[]) => {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (next: string[]) => {
      state = next;
      for (const listener of listeners) listener();
    },
    setStateWithoutNotifying: (next: string[]) => {
      state = next;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const useSecondItem = (store: ReturnType<typeof createStore>) =>
  useSyncExternalStore(
    useCallback((cb: () => void) => store.subscribe(cb), [store]),
    useCallback(() => {
      const items = store.getState();
      if (items.length < 2) throw new Error("index out of bounds");
      return items[1]!;
    }, [store]),
  );
const SecondItem = resource(useSecondItem);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { message: string | null }
> {
  override state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  override render() {
    if (this.state.message !== null) return <>caught: {this.state.message}</>;
    return this.props.children;
  }
}

describe("useSyncExternalStore snapshot throws", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces a notification-time throw at render, where a React error boundary catches it", async () => {
    const store = createStore(["a", "b"]);
    const Item = () => <>{useResource(SecondItem(store))}</>;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <Item />
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe("b");

    await act(async () => {
      store.setState(["a"]);
      await waitForNextTick();
    });

    expect(container.textContent).toBe("caught: index out of bounds");
  });

  it("re-renders with the new value once a transient throw recovers", async () => {
    const store = createStore(["a", "b"]);
    const Item = () => <>{useResource(SecondItem(store))}</>;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <Item />
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe("b");

    await act(async () => {
      // the throwing snapshot is the only notification: the repair is silent,
      // so the re-render can only come from this notification being treated as
      // changed
      store.setState(["a"]);
      store.setStateWithoutNotifying(["a", "c"]);
      await waitForNextTick();
    });

    expect(container.textContent).toBe("c");
  });
});

describe("useSyncExternalStore snapshot throws on a createTapRoot host", () => {
  it("surfaces a persistently throwing snapshot from the scheduler flush", async () => {
    const store = createStore(["a", "b"]);
    const root = createTapRoot(
      function SnapshotThrowRoot() {
        return useResource(SecondItem(store));
      },
      { mountOnSubscribe: true },
    );
    const unsubscribe = root.subscribe(() => {});

    expect(root.getValue()).toBe("b");

    // on this host the forced re-render runs inside the flush, so the error
    // leaves the flush rather than reaching a React error boundary
    expect(() => flushTapSync(() => store.setState(["a"]))).toThrow(
      "index out of bounds",
    );

    unsubscribe();
    // drain the scheduled unmount task so it cannot escape past this test
    await waitForNextTick();
  });
});
