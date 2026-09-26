import { describe, it, expect, afterEach, vi } from "vitest";
import { Component, Suspense, type ReactNode } from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  createTestResource,
  renderTest,
  getCommittedValue,
  cleanupAllResources,
  waitFor as waitForCondition,
} from "../test-utils";
import { resource } from "../../core/resource";
import { useSuspenseResource } from "../../index";
import { use } from "../../react-hooks/use";
import { useState as useResourceState } from "../../react-hooks/useState";
import { useEffect as useResourceEffect } from "../../react-hooks/useEffect";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  override state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    if (this.state.error !== null)
      return <div data-testid="error">{String(this.state.error)}</div>;
    return this.props.children;
  }
}

describe("useSuspenseResource", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  it("returns the fallback value while suspended and the primary value after resolve, without reaching the React Suspense boundary", async () => {
    const { promise, resolve } = deferred<string>();
    const Primary = resource(() => use(promise) as string);
    const Fallback = resource((props: { label: string }) => {
      return `loading:${props.label}`;
    });

    function App() {
      const value = useSuspenseResource(Primary(), Fallback({ label: "x" }));
      return <div data-testid="out">{value as string}</div>;
    }

    render(
      <Suspense fallback={<div data-testid="react-fallback" />}>
        <App />
      </Suspense>,
    );

    expect(screen.queryByTestId("react-fallback")).toBeNull();
    expect(screen.getByTestId("out").textContent).toBe("loading:x");

    await act(async () => {
      resolve("done");
      await promise;
    });
    expect(screen.getByTestId("out").textContent).toBe("done");
  });

  it("mounts fallback effects while suspended and cleans them up on recovery", async () => {
    const { promise, resolve } = deferred<string>();
    const log: string[] = [];
    const Primary = resource(() => use(promise) as string);
    const Fallback = resource(() => {
      useResourceEffect(() => {
        log.push("fallback:setup");
        return () => log.push("fallback:cleanup");
      }, []);
      return "loading";
    });

    function App() {
      const value = useSuspenseResource(Primary(), Fallback());
      return <div data-testid="out">{value as string}</div>;
    }

    render(<App />);
    expect(log).toEqual(["fallback:setup"]);

    await act(async () => {
      resolve("done");
      await promise;
    });
    expect(screen.getByTestId("out").textContent).toBe("done");
    expect(log).toEqual(["fallback:setup", "fallback:cleanup"]);
  });

  it("preserves primary state across an update suspension and remounts its effects on recovery", async () => {
    const { promise, resolve } = deferred<string>();
    const log: string[] = [];

    const Primary = resource(() => {
      const [count, setCount] = useResourceState(0);
      const [mode, setMode] = useResourceState<"sync" | "async">("sync");
      useResourceEffect(() => {
        log.push("primary:setup");
        return () => log.push("primary:cleanup");
      }, []);
      const suffix = mode === "async" ? (use(promise) as string) : "sync";
      return { text: `${count}:${suffix}`, setCount, setMode };
    });
    const Fallback = resource(() => "loading");

    let api!: {
      text?: string;
      setCount?: (n: number) => void;
      setMode?: (m: "sync" | "async") => void;
    };
    function App() {
      const value = useSuspenseResource(Primary(), Fallback());
      api = typeof value === "string" ? {} : value;
      return (
        <div data-testid="out">
          {typeof value === "string" ? value : value.text}
        </div>
      );
    }

    render(<App />);
    expect(screen.getByTestId("out").textContent).toBe("0:sync");
    expect(log).toEqual(["primary:setup"]);

    act(() => api.setCount!(5));
    expect(screen.getByTestId("out").textContent).toBe("5:sync");

    act(() => api.setMode!("async"));
    expect(screen.getByTestId("out").textContent).toBe("loading");
    expect(log).toEqual(["primary:setup", "primary:cleanup"]);

    await act(async () => {
      resolve("async");
      await promise;
    });
    expect(screen.getByTestId("out").textContent).toBe("5:async");
    expect(log).toEqual(["primary:setup", "primary:cleanup", "primary:setup"]);
  });

  it("creates a fresh fallback fiber for each suspension cycle", async () => {
    const first = deferred<string>();
    const second = deferred<string>();

    const Primary = resource(() => {
      const [step, setStep] = useResourceState(0);
      const value =
        step === 0
          ? "initial"
          : step === 1
            ? (use(first.promise) as string)
            : (use(second.promise) as string);
      return { kind: "primary" as const, value, setStep };
    });
    const Fallback = resource(() => {
      const [n, setN] = useResourceState(0);
      return { kind: "fallback" as const, n, bump: () => setN((v) => v + 1) };
    });

    let current!:
      | { kind: "primary"; value: string; setStep: (n: number) => void }
      | { kind: "fallback"; n: number; bump: () => void };
    let primary!: { setStep: (n: number) => void };
    function App() {
      current = useSuspenseResource(Primary(), Fallback());
      if (current.kind === "primary") primary = current;
      return (
        <div data-testid="out">
          {current.kind === "primary" ? current.value : `fb:${current.n}`}
        </div>
      );
    }

    render(<App />);
    expect(screen.getByTestId("out").textContent).toBe("initial");

    act(() => primary.setStep(1));
    expect(screen.getByTestId("out").textContent).toBe("fb:0");

    act(() => (current as { bump: () => void }).bump());
    expect(screen.getByTestId("out").textContent).toBe("fb:1");

    await act(async () => {
      first.resolve("one");
      await first.promise;
    });
    expect(screen.getByTestId("out").textContent).toBe("one");

    act(() => primary.setStep(2));
    expect(screen.getByTestId("out").textContent).toBe("fb:0");

    await act(async () => {
      second.resolve("two");
      await second.promise;
    });
    expect(screen.getByTestId("out").textContent).toBe("two");
  });

  it("propagates a rejected thenable as a render error on retry", async () => {
    const { promise, reject } = deferred<string>();
    const Primary = resource(() => use(promise) as string);
    const Fallback = resource(() => "loading");

    function App() {
      const value = useSuspenseResource(Primary(), Fallback());
      return <div data-testid="out">{value as string}</div>;
    }

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
      expect(screen.getByTestId("out").textContent).toBe("loading");

      await act(async () => {
        reject(new Error("boom"));
        await promise.catch(() => {});
      });
      expect(screen.getByTestId("error").textContent).toBe("Error: boom");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("works inside a tap-hosted resource", async () => {
    const { promise, resolve } = deferred<string>();
    const Primary = resource(() => use(promise) as string);
    const Fallback = resource(() => "loading");

    const parent = createTestResource(() =>
      useSuspenseResource(Primary(), Fallback()),
    );

    expect(renderTest(parent)).toBe("loading");

    resolve("done");
    await waitForCondition(() => getCommittedValue(parent) === "done");
  });
});
