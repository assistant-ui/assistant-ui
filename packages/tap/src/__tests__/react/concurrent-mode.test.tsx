import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Suspense, startTransition, use, useState } from "react";
import { resource } from "../../core/resource";
import { useResource } from "../../react/use-resource";
import { tapState } from "../../hooks/tap-state";

const ShouldNeverFallback = () => {
  throw new Error("should never fallback");
};

describe("Concurrent Mode with useResource", () => {
  it("should not commit tapState updates when render is discarded", async () => {
    const TestResource = resource(() => {
      return tapState(false);
    });

    let resolve: (value: number) => void;

    const suspendPromise = new Promise<number>((r) => {
      resolve = r;
    });

    function Suspender() {
      const result = use(suspendPromise);
      return result;
    }

    function App() {
      const [load, setLoading] = useResource(TestResource());
      const [message, setMessage] = useState("none");

      return (
        <>
          <button data-testid="hello-btn" onClick={() => setMessage("hello")} />
          <div data-testid="message">{message}</div>
          <div data-testid="load">{load ? "true" : "false"}</div>

          <button
            data-testid="suspend-btn"
            onClick={() => {
              startTransition(() => {
                setLoading(true);
              });
            }}
          />
          <Suspense fallback={<ShouldNeverFallback />}>
            <div data-testid="value">{load ? <Suspender /> : "none"}</div>
          </Suspense>
        </>
      );
    }

    render(<App />);
    expect(screen.getByTestId("message").textContent).toBe("none");
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("suspend-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("hello-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("message").textContent).toBe("hello");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => resolve!(10));

    expect(screen.getByTestId("value").textContent).toBe("10");
    expect(screen.getByTestId("message").textContent).toBe("hello");
  });

  it("react should not commit tapState updates when render is discarded", async () => {
    let resolve: (value: number) => void;

    const suspendPromise = new Promise<number>((r) => {
      resolve = r;
    });

    function Suspender() {
      const result = use(suspendPromise);
      return result;
    }

    function App() {
      const [load, setLoading] = useState(false);
      const [message, setMessage] = useState("none");

      return (
        <>
          <button data-testid="hello-btn" onClick={() => setMessage("hello")} />
          <div data-testid="message">{message}</div>
          <div data-testid="load">{load ? "true" : "false"}</div>

          <button
            data-testid="suspend-btn"
            onClick={() => {
              startTransition(() => {
                setLoading(true);
              });
            }}
          />
          <Suspense fallback={<ShouldNeverFallback />}>
            <div data-testid="value">{load ? <Suspender /> : "none"}</div>
          </Suspense>
        </>
      );
    }

    render(<App />);
    expect(screen.getByTestId("message").textContent).toBe("none");
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("suspend-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("hello-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("message").textContent).toBe("hello");
    expect(screen.getByTestId("load").textContent).toBe("false"); // no tearing

    await act(async () => resolve!(10));

    expect(screen.getByTestId("value").textContent).toBe("10");
    expect(screen.getByTestId("message").textContent).toBe("hello");
  });

  it("should keep old UI during startTransition when resource suspends", async () => {
    let resolve: () => void;
    let shouldSuspend = false;

    const TestResource = resource((props: { id: number }) => {
      if (shouldSuspend) {
        throw new Promise<void>((r) => {
          resolve = r;
        });
      }
      return { value: `content-${props.id}` };
    });

    function Inner({ id }: { id: number }) {
      const result = useResource(TestResource({ id }));
      return <div data-testid="result">{result.value}</div>;
    }

    function App() {
      const [id, setId] = useState(1);
      return (
        <div>
          <button
            data-testid="btn"
            onClick={() => {
              shouldSuspend = true;
              startTransition(() => setId(2));
            }}
          />
          <Suspense fallback={<div data-testid="fallback">Loading</div>}>
            <Inner id={id} />
          </Suspense>
        </div>
      );
    }

    render(<App />);
    expect(screen.getByTestId("result").textContent).toBe("content-1");

    // Click triggers transition that suspends
    act(() => screen.getByTestId("btn").click());

    // Old UI preserved during transition
    expect(screen.getByTestId("result").textContent).toBe("content-1");

    // Resolve suspension
    shouldSuspend = false;
    await act(async () => resolve());

    // New UI shown
    expect(screen.getByTestId("result").textContent).toBe("content-2");
  });

  it("react test", async () => {
    let resolve: (value: number) => void;

    const suspendPromise = new Promise<number>((r) => {
      resolve = r;
    });

    function Suspender() {
      const result = use(suspendPromise);
      return result;
    }

    function App() {
      const [load, setLoading] = useState(false);
      const [message, setMessage] = useState("none");

      return (
        <>
          <button data-testid="hello-btn" onClick={() => setMessage("hello")} />
          <div data-testid="message">{message}</div>
          <div data-testid="load">{load ? "true" : "false"}</div>

          <button
            data-testid="suspend-btn"
            onClick={() => {
              startTransition(() => {
                setLoading(true);
              });
            }}
          />
          <Suspense fallback={<ShouldNeverFallback />}>
            <div data-testid="value">{load ? <Suspender /> : "none"}</div>
          </Suspense>
        </>
      );
    }

    render(<App />);
    expect(screen.getByTestId("message").textContent).toBe("none");
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("suspend-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("load").textContent).toBe("false");

    await act(async () => screen.getByTestId("hello-btn").click());
    expect(screen.getByTestId("value").textContent).toBe("none");
    expect(screen.getByTestId("message").textContent).toBe("hello");
    expect(screen.getByTestId("load").textContent).toBe("false"); // no tearing

    await act(async () => resolve!(10));

    expect(screen.getByTestId("value").textContent).toBe("10");
    expect(screen.getByTestId("message").textContent).toBe("hello");
  });
});
