import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  createTestResource,
  renderTest,
  cleanupAllResources,
} from "../test-utils";
import { resource } from "../../core/resource";
import { withKey } from "../../core/withKey";
import { useState } from "react";
import { useState as useResourceState } from "../../hooks/useState";
import { useEffect as useResourceEffect } from "../../hooks/useEffect";
import {
  useResource,
  useResources,
  useTapRoot,
  flushTapSync,
} from "../../index";

describe("@assistant-ui/tap/react resource API", () => {
  afterEach(() => {
    cleanupAllResources();
    cleanup();
  });

  describe("useResource", () => {
    it("routes to useResource inside a tap resource", () => {
      const useChild = (props: { n: number }) => {
        return props.n * 2;
      };

      const Child = resource(useChild);
      const parent = createTestResource(() => useResource(Child({ n: 21 })));
      expect(renderTest(parent)).toBe(42);
    });

    it("routes to the React bridge inside a component", () => {
      const useCounterResource = () => {
        const [count, setCount] = useResourceState(0);
        return { count, setCount };
      };

      const CounterResource = resource(useCounterResource);

      let api: { count: number; setCount: (n: number) => void } | null = null;
      function App() {
        api = useResource(CounterResource());
        return <div data-testid="count">{api.count}</div>;
      }

      render(<App />);
      expect(screen.getByTestId("count").textContent).toBe("0");
      act(() => api!.setCount(3));
      expect(screen.getByTestId("count").textContent).toBe("3");
    });
  });

  describe("useResources", () => {
    it("hosts a keyed list inside a tap resource", () => {
      const useItem = (p: { n: number }) => {
        return p.n * 10;
      };

      const Item = resource(useItem);
      const parent = createTestResource(() =>
        useResources(() => [
          withKey("a", Item({ n: 1 })),
          withKey("b", Item({ n: 2 })),
        ]),
      );
      expect(renderTest(parent)).toEqual([10, 20]);
    });

    it("hosts a keyed list inside a React component and tracks deps", () => {
      const useItem = (p: { n: number }) => {
        const [v] = useResourceState(p.n * 10);
        return v;
      };

      const Item = resource(useItem);

      let setCount: (n: number) => void = () => {};
      function App() {
        const [count, setCountState] = useState(2);
        setCount = setCountState;
        const items = useResources(
          () =>
            Array.from({ length: count }, (_, i) =>
              withKey(i, Item({ n: i + 1 })),
            ),
          [count],
        );
        return <div data-testid="list">{items.join(",")}</div>;
      }

      render(<App />);
      expect(screen.getByTestId("list").textContent).toBe("10,20");
      act(() => setCount(3));
      expect(screen.getByTestId("list").textContent).toBe("10,20,30");
    });
  });

  describe("useTapRoot", () => {
    it("exposes a subscribable inside a tap resource", () => {
      const useRoot = () => {
        const [n] = useResourceState(7);
        return n;
      };

      const parent = createTestResource(() =>
        useTapRoot(function Root() {
          return useRoot();
        }).getValue(),
      );
      expect(renderTest(parent)).toBe(7);
    });

    // A root is push-based: host it in one place and observe it via getValue/
    // subscribe elsewhere. (Hosting AND re-rendering off its own value in the same
    // component self-feeds, since useResourceHost re-renders the root on every host render
    // and the root notifies on output change — so this test observes the store
    // directly rather than through a same-component useSyncExternalStore.)
    it("hosts a subscribable root inside a React component", () => {
      const useCounterRoot = () => {
        const [count, setCount] = useResourceState(0);
        return { count, setCount };
      };

      let store: ReturnType<
        typeof useTapRoot<{
          count: number;
          setCount: (n: number) => void;
        }>
      > | null = null;
      function App() {
        store = useTapRoot(function Root() {
          return useCounterRoot();
        });
        return null;
      }

      render(<App />);
      expect(store!.getValue().count).toBe(0);

      let notified = 0;
      const unsubscribe = store!.subscribe(() => {
        notified++;
      });

      // The root drives updates through tap's own (macrotask) scheduler, so flush
      // synchronously to observe.
      flushTapSync(() => store!.getValue().setCount(5));
      expect(store!.getValue().count).toBe(5);
      expect(notified).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe("useResource key remount (React bridge)", () => {
    it("remounts the hosted resource when the element key changes", () => {
      const mounts: number[] = [];
      const useKeyed = (p: { id: number }) => {
        // oxlint-disable-next-line react/exhaustive-deps -- capture the mount id once per fiber to assert remount on key change
        useResourceEffect(() => void mounts.push(p.id), []);
        return p.id;
      };

      const Keyed = resource(useKeyed);

      let setId: (n: number) => void = () => {};
      function App() {
        const [id, setIdState] = useState(1);
        setId = setIdState;
        const out = useResource(withKey(id, Keyed({ id })));
        return <div data-testid="keyed">{out}</div>;
      }

      render(<App />);
      expect(screen.getByTestId("keyed").textContent).toBe("1");
      expect(mounts).toEqual([1]);
      act(() => setId(2));
      expect(screen.getByTestId("keyed").textContent).toBe("2");
      expect(mounts).toEqual([1, 2]);
    });
  });
});
