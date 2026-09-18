import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useEffect, useState } from "react";
import { resource, useResource } from "../../index";
import { cleanupAllResources } from "../test-utils";

afterEach(() => {
  cleanupAllResources();
  cleanup();
});

// A no-op `set(prev => prev)` from an effect whose dependency changes on
// every render must settle under a React host instead of re-rendering forever.
describe("useResource in a React host: no-op dispatch from an effect", () => {
  it("settles when the effect fires on every commit", async () => {
    let renders = 0;
    const Pruner = resource(({ items }: { items: readonly string[] }) => {
      renders++;
      const [seen, setSeen] = useState<Record<string, true>>({});
      useEffect(() => {
        setSeen((prev) => {
          const live = Object.keys(prev).filter((id) => items.includes(id));
          return live.length === Object.keys(prev).length
            ? prev
            : Object.fromEntries(live.map((id) => [id, true as const]));
        });
      }, [items]);
      return {
        seen,
        mark: (id: string) => setSeen((p) => ({ ...p, [id]: true })),
      };
    });

    let api!: { seen: Record<string, true>; mark: (id: string) => void };
    let hostRenders = 0;
    let bump!: () => void;
    function App() {
      hostRenders++;
      const [tick, setTick] = useState(0);
      bump = () => setTick((t) => t + 1);
      api = useResource(Pruner({ items: ["a", `b${tick}`] }));
      return <div data-testid="seen">{Object.keys(api.seen).join(",")}</div>;
    }

    render(<App />);
    await act(async () => {});
    act(() => api.mark("a"));
    act(() => bump());
    await act(async () => {});
    expect(screen.getByTestId("seen").textContent).toBe("a");
    expect(hostRenders).toBeLessThan(10);
    expect(renders).toBeLessThan(10);

    act(() => api.mark("zzz"));
    await act(async () => {});
    expect(screen.getByTestId("seen").textContent).toBe("a");
    expect(hostRenders).toBeLessThan(15);
  });
});
