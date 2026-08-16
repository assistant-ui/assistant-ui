import { describe, it, expect, afterEach, vi } from "vitest";
import { Suspense } from "react";
import { useSyncExternalStore } from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useTapRoot, flushTapSync } from "../../index";
import { use } from "../../react-hooks/use";
import { useState as useResourceState } from "../../react-hooks/useState";

describe("useTapRoot suspense", () => {
  afterEach(() => {
    cleanup();
  });

  it("an initial render suspension reaches the React Suspense boundary", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });

    function Host() {
      const root = useTapRoot(function Data() {
        return use(promise) as string;
      });
      return <div data-testid="out">{root.getValue()}</div>;
    }

    render(
      <Suspense fallback={<div data-testid="fallback">loading</div>}>
        <Host />
      </Suspense>,
    );
    expect(screen.queryByTestId("out")).toBeNull();
    expect(screen.getByTestId("fallback").textContent).toBe("loading");

    resolve("ready");
    const out = await screen.findByTestId("out");
    expect(out.textContent).toBe("ready");
  });

  it("a host re-render during a held suspension keeps the committed value", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    let bump!: (value: number) => void;
    let getValue!: () => string;

    function Host() {
      const root = useTapRoot(function Data() {
        const [count, setCount] = useResourceState(0);
        bump = setCount;
        return count === 0 ? "sync" : (use(promise) as string);
      });
      getValue = root.getValue;
      const value = useSyncExternalStore(root.subscribe, root.getValue);
      return <div data-testid="out">{value}</div>;
    }

    const ui = () => (
      <Suspense fallback={<div data-testid="fallback">loading</div>}>
        <Host />
      </Suspense>
    );
    const { rerender } = render(ui());
    expect(screen.getByTestId("out").textContent).toBe("sync");

    act(() => {
      flushTapSync(() => bump(1));
    });
    rerender(ui());

    expect(screen.queryByTestId("fallback")).toBeNull();
    expect(screen.getByTestId("out").textContent).toBe("sync");

    await act(async () => {
      resolve("async");
      await promise;
      await vi.waitFor(() => expect(getValue()).toBe("async"));
    });
    expect(screen.getByTestId("out").textContent).toBe("async");
  });

  it("an update suspension holds the committed value and converges on resolve", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    let bump!: (value: number) => void;
    let getValue!: () => string;

    function Host() {
      const root = useTapRoot(function Data() {
        const [count, setCount] = useResourceState(0);
        bump = setCount;
        return count === 0 ? "sync" : (use(promise) as string);
      });
      getValue = root.getValue;
      const value = useSyncExternalStore(root.subscribe, root.getValue);
      return <div data-testid="out">{value}</div>;
    }

    render(<Host />);
    expect(screen.getByTestId("out").textContent).toBe("sync");

    act(() => {
      flushTapSync(() => bump(1));
    });
    expect(screen.getByTestId("out").textContent).toBe("sync");

    await act(async () => {
      resolve("async");
      await promise;
      await vi.waitFor(() => expect(getValue()).toBe("async"));
    });

    expect(screen.getByTestId("out").textContent).toBe("async");
  });
});
