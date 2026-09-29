import { describe, it, expect, afterEach, vi } from "vitest";
import { Component, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useTapRoot, flushTapSync } from "../../index";
import { useState as useResourceState } from "../../react-hooks/useState";
import { useSyncExternalStore as useTapSyncExternalStore } from "../../react-hooks/useSyncExternalStore";
import { waitForNextTick } from "../test-utils";

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  override state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    return this.state.error ? (
      <div data-testid="caught">{(this.state.error as Error).message}</div>
    ) : (
      this.props.children
    );
  }
}

describe("useTapRoot host renders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("surfaces a throwing update render through the React error boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let bump!: (value: number) => void;

    function Host() {
      const root = useTapRoot(function Bomb() {
        const [count, setCount] = useResourceState(0);
        bump = setCount;
        if (count > 0) throw new Error("boom");
        return count;
      });
      const value = useSyncExternalStore(root.subscribe, root.getValue);
      return <div data-testid="out">{value}</div>;
    }

    render(
      <Boundary>
        <Host />
      </Boundary>,
    );
    expect(screen.getByTestId("out").textContent).toBe("0");

    act(() => {
      flushTapSync(() => bump(1));
    });

    expect(screen.getByTestId("caught").textContent).toBe("boom");
  });

  it("surfaces a throwing getSnapshot through the React error boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let state: string[] = ["a", "b"];
    const listeners = new Set<() => void>();
    const store = {
      getState: () => {
        if (state.length < 2) throw new Error("index out of bounds");
        return state[1];
      },
      setState: (next: string[]) => {
        state = next;
        for (const listener of listeners) listener();
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };

    function Host() {
      const root = useTapRoot(function Store() {
        return useTapSyncExternalStore(
          (cb) => store.subscribe(cb),
          () => store.getState(),
        );
      });
      const value = useSyncExternalStore(root.subscribe, root.getValue);
      return <div data-testid="out">{value}</div>;
    }

    render(
      <Boundary>
        <Host />
      </Boundary>,
    );
    expect(screen.getByTestId("out").textContent).toBe("b");

    act(() => {
      flushTapSync(() => store.setState(["a"]));
    });

    expect(screen.getByTestId("caught").textContent).toBe(
      "index out of bounds",
    );
  });

  it("notifies later root subscribers when one throws", () => {
    let root!: useTapRoot.Root<number>;
    let setCount!: (value: number) => void;

    function Host() {
      root = useTapRoot(function Counter() {
        const [count, setState] = useResourceState(0);
        setCount = setState;
        return count;
      });
      return null;
    }

    render(<Host />);
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    root.subscribe(() => {
      throw error;
    });
    root.subscribe(laterSubscriber);

    expect(() => flushTapSync(() => setCount(1))).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
    expect(root.getValue()).toBe(1);
  });

  it("a host render consumes pending updates and the scheduled flush no-ops", async () => {
    let renders = 0;
    let bump!: (value: number) => void;
    let hostRerender!: () => void;

    function Host() {
      const [, setTick] = useState(0);
      hostRerender = () => setTick((t) => t + 1);
      const root = useTapRoot(function Counter() {
        renders++;
        const [count, setCount] = useResourceState(0);
        bump = setCount;
        return count;
      });
      const value = useSyncExternalStore(root.subscribe, root.getValue);
      return <div data-testid="out">{value}</div>;
    }

    render(<Host />);
    expect(screen.getByTestId("out").textContent).toBe("0");
    const rendersAfterMount = renders;

    // the host render arrives before the macrotask flush and consumes the
    // pending update; the flush then has nothing left to do
    act(() => {
      bump(1);
      hostRerender();
    });
    expect(screen.getByTestId("out").textContent).toBe("1");
    const rendersAfterHostRender = renders;

    await act(() => waitForNextTick());
    expect(renders).toBe(rendersAfterHostRender);
    // one render consumed the update, one followed the subscriber notify
    expect(renders).toBe(rendersAfterMount + 2);
    expect(screen.getByTestId("out").textContent).toBe("1");
  });
});
