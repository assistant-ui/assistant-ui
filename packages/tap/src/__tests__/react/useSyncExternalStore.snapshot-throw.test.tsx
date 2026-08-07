import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { resource } from "../../core/resource";
import { useResource } from "../../hooks/useResource";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { useSyncExternalStore } from "../../react-hooks/useSyncExternalStore";
import { useCallback } from "../../react-hooks/useCallback";

const createStore = (initial: string[]) => {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (next: string[]) => {
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const SecondItem = resource((store: ReturnType<typeof createStore>) =>
  useSyncExternalStore(
    useCallback((cb: () => void) => store.subscribe(cb), [store]),
    useCallback(() => {
      const items = store.getState();
      if (items.length < 2) throw new Error("index out of bounds");
      return items[1]!;
    }, [store]),
  ),
);

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

const waitForMacrotaskFlush = () => new Promise((r) => setTimeout(r, 10));

type UncaughtListener = (error: unknown) => void;
const nodeProcess = (
  globalThis as unknown as {
    process: {
      on(event: "uncaughtException", listener: UncaughtListener): void;
      off(event: "uncaughtException", listener: UncaughtListener): void;
    };
  }
).process;

const collectUncaught = () => {
  const errors: unknown[] = [];
  const listener: UncaughtListener = (error) => errors.push(error);
  nodeProcess.on("uncaughtException", listener);
  return {
    errors,
    dispose: () => nodeProcess.off("uncaughtException", listener),
  };
};

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
      await waitForMacrotaskFlush();
    });

    expect(container.textContent).toBe("caught: index out of bounds");
  });

  it("reports nothing when the snapshot recovers before the scheduled re-render reads it", async () => {
    const store = createStore(["a", "b"]);
    const uncaught = collectUncaught();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = createTapRoot(() => useResource(SecondItem(store)));

    // the transient: throwing snapshot, repaired within the same task
    store.setState(["a"]);
    store.setState(["a", "c"]);
    await waitForMacrotaskFlush();

    expect(root.getValue()).toBe("c");
    expect(consoleError).not.toHaveBeenCalled();
    expect(uncaught.errors).toEqual([]);

    uncaught.dispose();
    root.unmount();
  });

  it("does not turn a scheduled flush into an uncaught exception", async () => {
    const store = createStore(["a", "b"]);
    const uncaught = collectUncaught();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = createTapRoot(() => useResource(SecondItem(store)));

    expect(() => store.setState(["a"])).not.toThrow();
    await waitForMacrotaskFlush();

    expect(uncaught.errors).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]![0]).toMatchObject({
      message: "index out of bounds",
    });

    uncaught.dispose();
    root.unmount();
  });

  it("hands a synchronous flush's error to the caller of flushTapSync", async () => {
    const store = createStore(["a", "b"]);
    const uncaught = collectUncaught();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = createTapRoot(() => useResource(SecondItem(store)));

    // stands in for NotificationManager, which catches and logs
    const absorbed: unknown[] = [];
    try {
      flushTapSync(() => store.setState(["a"]));
    } catch (error) {
      absorbed.push(error);
    }
    await waitForMacrotaskFlush();

    expect(absorbed).toHaveLength(1);
    expect(absorbed[0]).toMatchObject({ message: "index out of bounds" });
    expect(uncaught.errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();

    uncaught.dispose();
    root.unmount();
  });
});
