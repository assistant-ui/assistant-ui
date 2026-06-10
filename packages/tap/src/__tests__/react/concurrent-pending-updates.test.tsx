/**
 * A/B concurrency tests for pending updates in tap-scheduled sub-roots.
 *
 * Since the pending-update queue removal, dispatches apply directly into
 * reducer cells, and a React-driven render of a useTapRoot sub-root consumes
 * pending entries — including render attempts React later discards. These
 * tests run the same scenario in two worlds:
 *
 *   react — the hooks run directly in the component (React's own update
 *           queue semantics are the oracle)
 *   tap   — the hooks run in a useTapRoot sub-root read via
 *           useSyncExternalStore
 *
 * and assert the committed, observable output matches at every checkpoint.
 * Render-attempt interleavings are deliberately NOT compared (scheduling
 * differs legitimately); committed state must not.
 */
/* oxlint-disable react/rules-of-hooks -- the world branch is fixed per test run */

import { describe, it, expect, afterEach } from "vitest";
import {
  StrictMode,
  Suspense,
  startTransition,
  use,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useTapRoot } from "../../index";
import { cleanupAllResources } from "../test-utils";

afterEach(() => {
  cleanupAllResources();
  cleanup();
});

type WorldName = "react" | "tap";

const useInWorld = <T,>(world: WorldName, useBody: () => T): T => {
  if (world === "react") return useBody();
  const root = useTapRoot(function Sub() {
    return useBody();
  });
  return useSyncExternalStore(root.subscribe, root.getValue, root.getValue);
};

/**
 * Two chained reducer cells; `add` dispatches to both in one event. The
 * return value is identity-stable per state (the useSyncExternalStore
 * snapshot contract for tap roots).
 */
const useCounters = () => {
  const [a, addA] = useReducer((s: number, n: number) => s + n, 0);
  const [b, addB] = useReducer((s: number, n: number) => s + n, 100);
  return useMemo(
    () => ({
      a,
      b,
      add: (n: number) => {
        addA(n);
        addB(n * 2);
      },
    }),
    [a, b],
  );
};

const ShouldNeverFallback = () => {
  throw new Error("should never fallback");
};

describe("pending updates under concurrent rendering (react vs tap)", () => {
  it("a forced re-render between dispatch and flush applies each update exactly once", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      const checkpoints: string[] = [];
      let api!: ReturnType<typeof useCounters>;

      function App() {
        const counters = useInWorld(world, useCounters);
        api = counters;
        const [, setTick] = useState(0);
        return (
          <>
            <button
              type="button"
              data-testid="rerender"
              onClick={() => setTick((t) => t + 1)}
            />
            <div data-testid="out">
              a={counters.a} b={counters.b}
            </div>
          </>
        );
      }

      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      checkpoints.push(screen.getByTestId("out").textContent!);

      // Dispatch, then force a synchronous host re-render in the same act
      // before the tap scheduler's macrotask flush can run. In the tap world
      // this makes the React-driven render consume the pending entries; the
      // later flush must not re-apply them.
      await act(async () => {
        api.add(1);
        screen.getByTestId("rerender").click();
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      // Let any remaining scheduled flush settle.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      return checkpoints;
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog.at(-1)).toBe("a=1 b=102");
    expect(tapLog).toEqual(reactLog);
  });

  it("pending dispatches survive a render attempt discarded by suspense", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      const checkpoints: string[] = [];
      let api!: ReturnType<typeof useCounters>;
      let resolve!: (v: number) => void;
      const gate = new Promise<number>((r) => {
        resolve = r;
      });

      function Suspender() {
        return use(gate);
      }

      function App() {
        const counters = useInWorld(world, useCounters);
        api = counters;
        const [load, setLoad] = useState(false);
        return (
          <>
            <button
              type="button"
              data-testid="suspend"
              onClick={() => startTransition(() => setLoad(true))}
            />
            <div data-testid="out">
              a={counters.a} b={counters.b}
            </div>
            <Suspense fallback={<ShouldNeverFallback />}>
              <div data-testid="gated">{load ? <Suspender /> : "none"}</div>
            </Suspense>
          </>
        );
      }

      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );

      // Start a transition whose render attempt suspends (and is repeatedly
      // discarded/retried while the gate is pending).
      await act(async () => {
        screen.getByTestId("suspend").click();
      });

      // Dispatch while the suspended transition is in flight; the urgent
      // re-render and discarded transition attempts race the tap flush.
      await act(async () => {
        api.add(1);
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      await act(async () => {
        resolve(7);
      });
      checkpoints.push(screen.getByTestId("out").textContent!);
      checkpoints.push(screen.getByTestId("gated").textContent!);

      return checkpoints;
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog).toEqual(["a=1 b=102", "a=1 b=102", "7"]);
    expect(tapLog).toEqual(reactLog);
  });

  it("suspension between chained reducer cells leaves no partial or double application", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      const checkpoints: string[] = [];
      let resolve!: (v: number) => void;
      const gate = new Promise<number>((r) => {
        resolve = r;
      });
      let gateOpen = false;
      let api!: { add: (n: number) => void };

      // The suspension happens INSIDE the body, between the two reducer
      // cells, so a discarded attempt has consumed cell A's entries but not
      // cell B's. Suspense uses the throw protocol: tap's `use()` accepts
      // only resource contexts, but a thrown promise propagates out of the
      // resource render to React in both worlds.
      const useChained = () => {
        const [a, addA] = useReducer((s: number, n: number) => s + n, 0);
        if (!gateOpen) throw gate;
        const [b, addB] = useReducer((s: number, n: number) => s + n, 100);
        return useMemo(
          () => ({
            a,
            b,
            add: (n: number) => {
              addA(n);
              addB(n * 2);
            },
          }),
          [a, b],
        );
      };

      function Gated() {
        const counters = useInWorld(world, useChained);
        api = counters;
        return (
          <div data-testid="out">
            a={counters.a} b={counters.b}
          </div>
        );
      }

      function App() {
        const [show, setShow] = useState(false);
        return (
          <>
            <button
              type="button"
              data-testid="show"
              onClick={() => startTransition(() => setShow(true))}
            />
            <Suspense fallback={<div data-testid="fallback">loading</div>}>
              {show ? <Gated /> : <div data-testid="out">hidden</div>}
            </Suspense>
          </>
        );
      }

      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );

      // Mount the gated subtree: the body suspends between cell A and cell B.
      await act(async () => {
        screen.getByTestId("show").click();
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      // Open the gate so retries complete.
      await act(async () => {
        gateOpen = true;
        resolve(1);
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      // Updates after the rocky mount must still apply exactly once.
      await act(async () => {
        api.add(2);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      return checkpoints;
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog).toEqual(["hidden", "a=0 b=100", "a=2 b=104"]);
    expect(tapLog).toEqual(reactLog);
  });

  it("dispatches racing an interrupted transition apply exactly once", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      const checkpoints: string[] = [];
      let api!: ReturnType<typeof useCounters>;

      function App() {
        const counters = useInWorld(world, useCounters);
        api = counters;
        const [mode, setMode] = useState("idle");
        return (
          <>
            <button
              type="button"
              data-testid="transition"
              onClick={() => startTransition(() => setMode("busy"))}
            />
            <div data-testid="out">
              {mode} a={counters.a} b={counters.b}
            </div>
          </>
        );
      }

      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );

      // Start a transition and interrupt it with urgent dispatches before it
      // commits; React restarts the transition render around them.
      await act(async () => {
        screen.getByTestId("transition").click();
        api.add(1);
        api.add(10);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      return checkpoints;
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog).toEqual(["busy a=11 b=122"]);
    expect(tapLog).toEqual(reactLog);
  });
});
