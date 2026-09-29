import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useEffect, useState } from "react";
import { resource, useResource } from "../../index";
import { cleanupAllResources } from "../test-utils";

afterEach(() => {
  cleanupAllResources();
  cleanup();
});

// The effect depends on a prop that is a new array on every host render, so it
// dispatches after every commit. React evaluates a dispatch eagerly only while
// the host fiber has no pending work: the dispatch right after a render is
// queued and costs one host render that bails, and the next one bails eagerly.
describe("useResource in a React host: no-op dispatch from an effect", () => {
  it("settles after one bailed render per committed update", async () => {
    let resourceRenders = 0;
    const usePruner = ({ items }: { items: readonly string[] }) => {
      resourceRenders++;
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
    };
    const Pruner = resource(usePruner);

    let api!: ReturnType<typeof usePruner>;
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
    expect([hostRenders, resourceRenders]).toEqual([1, 1]);

    act(() => api.mark("a"));
    await act(async () => {});
    expect(screen.getByTestId("seen").textContent).toBe("a");
    expect([hostRenders, resourceRenders]).toEqual([3, 3]);

    act(() => bump());
    await act(async () => {});
    expect(screen.getByTestId("seen").textContent).toBe("a");
    expect([hostRenders, resourceRenders]).toEqual([5, 5]);

    act(() => api.mark("zzz"));
    await act(async () => {});
    // The pruning effect removes "zzz", which is a second committed update.
    expect(screen.getByTestId("seen").textContent).toBe("a");
    expect([hostRenders, resourceRenders]).toEqual([8, 8]);
  });
});
