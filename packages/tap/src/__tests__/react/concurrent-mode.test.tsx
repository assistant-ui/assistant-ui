import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Suspense, startTransition, useState } from "react";
import { resource } from "../../core/resource";
import { useResource } from "../../react/use-resource";

describe("Concurrent Mode with useResource", () => {
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
});
