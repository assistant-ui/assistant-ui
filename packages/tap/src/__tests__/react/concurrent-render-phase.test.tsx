/**
 * A/B concurrency tests for render-phase updates (setState during render)
 * in renders React discards and replays.
 *
 * A render-phase dispatch lives only inside its render attempt: tap drains it
 * within renderResourceFiber, and a discarded attempt is rolled back
 * (setRootVersion resets workInProgress and clears cell queues). The dispatch
 * therefore survives a discard only if the retry re-derives it from the
 * render's inputs. These tests run the same scenario in two worlds:
 *
 *   react — the hooks run directly in the component (React's render-phase
 *           queue semantics are the oracle)
 *   tap   — the hooks run in a useTapRoot sub-root read via
 *           useSyncExternalStore
 *
 * and assert the committed, observable output matches. Render-attempt
 * interleavings are deliberately NOT compared; committed state must not
 * differ.
 */
/* oxlint-disable react/rules-of-hooks -- the world branch is fixed per test run */

import { describe, it, expect, afterEach } from "vitest";
import {
  StrictMode,
  startTransition,
  Suspense,
  useMemo,
  useReducer,
  useRef,
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

describe("render-phase updates under concurrent rendering (react vs tap)", () => {
  it("pure derivations re-derive across an interrupted transition", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      let api!: { add: (x: number) => void };

      const useDerived = () => {
        const [n, addN] = useReducer((s: number, x: number) => s + x, 0);
        const [doubled, setDoubled] = useState(0);
        // The classic adjust-during-render pattern: a pure function of `n`,
        // so any discarded attempt's dispatch is re-derived on retry.
        if (doubled !== n * 2) setDoubled(n * 2);
        return useMemo(
          () => ({ n, doubled, add: (x: number) => addN(x) }),
          [n, doubled],
        );
      };

      function App() {
        const value = useInWorld(world, useDerived);
        api = value;
        const [mode, setMode] = useState("idle");
        return (
          <>
            <button
              type="button"
              data-testid="transition"
              onClick={() => startTransition(() => setMode("busy"))}
            />
            <div data-testid="out">
              {mode} n={value.n} doubled={value.doubled}
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
      return [screen.getByTestId("out").textContent!];
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog).toEqual(["busy n=11 doubled=22"]);
    expect(tapLog).toEqual(reactLog);
  });

  it("a non-re-derivable render-phase dispatch from a discarded attempt", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      let resolve!: (v: number) => void;
      const gate = new Promise<number>((r) => {
        resolve = r;
      });
      let gateOpen = false;

      function App() {
        const [mode, setMode] = useState("idle");
        // The one-shot guard lives in a ref, which neither React nor tap
        // restores when an attempt is discarded, so the retry does NOT
        // re-derive the dispatch. Whatever React commits is the oracle for
        // whether the dispatch survives the discard.
        const fired = useRef(false);
        const value = useInWorld(world, () => {
          const [count, bump] = useReducer((s: number, n: number) => s + n, 0);
          if (mode === "busy" && !fired.current) {
            fired.current = true;
            bump(100);
          }
          // Discard this attempt deterministically, after the dispatch.
          if (mode === "busy" && !gateOpen) throw gate;
          return useMemo(() => ({ count }), [count]);
        });
        return (
          <>
            <button
              type="button"
              data-testid="transition"
              onClick={() => startTransition(() => setMode("busy"))}
            />
            <div data-testid="out">
              {mode} count={value.count}
            </div>
          </>
        );
      }

      render(
        <StrictMode>
          <Suspense fallback={<div>loading</div>}>
            <App />
          </Suspense>
        </StrictMode>,
      );

      // The transition attempt renders mode=busy: the one-shot fires, the
      // render-phase dispatch is enqueued, then the attempt suspends and is
      // discarded.
      await act(async () => {
        screen.getByTestId("transition").click();
      });
      const midpoint = screen.getByTestId("out").textContent!;

      // Open the gate; the retry renders with the ref already consumed.
      await act(async () => {
        gateOpen = true;
        resolve(1);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      return [midpoint, screen.getByTestId("out").textContent!];
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    // React drops the render-phase dispatch together with the discarded
    // attempt: the queued update lived on the attempt's work-in-progress
    // hooks. Discard-on-rollback is therefore the React-correct semantics;
    // only re-derivable dispatches survive (see the previous test).
    expect(reactLog).toEqual(["idle count=0", "busy count=0"]);
    expect(tapLog).toEqual(reactLog);
  });

  it("a render-phase dispatch in an attempt aborted around a higher-priority commit", async () => {
    const run = async (
      world: WorldName,
    ): Promise<{ checkpoints: string[]; abortedAttemptRan: boolean }> => {
      const checkpoints: string[] = [];
      let resolve!: (v: number) => void;
      const gate = new Promise<number>((r) => {
        resolve = r;
      });
      let gateOpen = false;
      let api!: { add: (n: number) => void };
      let abortedAttemptRan = false;

      function App() {
        const [mode, setMode] = useState("idle");
        const fired = useRef(false);
        const value = useInWorld(world, () => {
          const [count, bump] = useReducer((s: number, n: number) => s + n, 0);
          // One-shot render-phase dispatch, made only by the low-priority
          // attempt; the ref guard means retries do not re-derive it.
          if (mode === "busy" && !fired.current) {
            fired.current = true;
            bump(100);
          }
          // Keep the low-priority attempt aborting until the gate opens, so
          // the higher-priority commit below lands while it is in flight.
          if (mode === "busy" && !gateOpen) {
            abortedAttemptRan = true;
            throw gate;
          }
          return useMemo(
            () => ({ count, add: (n: number) => bump(n) }),
            [count],
          );
        });
        api = value;
        return (
          <>
            <button
              type="button"
              data-testid="transition"
              onClick={() => startTransition(() => setMode("busy"))}
            />
            <div data-testid="out">
              {mode} count={value.count}
            </div>
          </>
        );
      }

      render(
        <StrictMode>
          <Suspense fallback={<div>loading</div>}>
            <App />
          </Suspense>
        </StrictMode>,
      );

      // 1. Begin the low-priority attempt; it runs (fires the render-phase
      //    dispatch) and aborts at the gate. The committed UI stays idle.
      await act(async () => {
        screen.getByTestId("transition").click();
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      // 2. A higher-priority dispatch commits while the low-priority attempt
      //    is in flight.
      await act(async () => {
        api.add(1);
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      // 3. Open the gate; the low-priority render retries and commits.
      await act(async () => {
        gateOpen = true;
        resolve(1);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      checkpoints.push(screen.getByTestId("out").textContent!);

      return { checkpoints, abortedAttemptRan };
    };

    const react = await run("react");
    cleanup();
    const tap = await run("tap");

    // The aborted attempt provably ran in both worlds.
    expect(react.abortedAttemptRan).toBe(true);
    expect(tap.abortedAttemptRan).toBe(true);

    // The higher-priority dispatch commits on the old UI mid-flight; the
    // aborted attempt's render-phase dispatch dies with the attempt.
    expect(react.checkpoints).toEqual([
      "idle count=0",
      "idle count=1",
      "busy count=1",
    ]);
    expect(tap.checkpoints).toEqual(react.checkpoints);
  });

  it("a committed render-phase update survives a later dispatch's rollback", async () => {
    const run = async (world: WorldName): Promise<string[]> => {
      let api!: { addTrail: (s: string) => void };

      const useTrail = () => {
        const [mounted, setMounted] = useState(false);
        // Non-eager useReducer: pending actions reduce over workInProgress at
        // render time, so a rollback that restores a stale base is visible.
        const [trail, addTrail] = useReducer(
          (s: string, x: string) => s + x,
          "",
        );
        // Non-re-derivable accumulation via a render-phase dispatch.
        if (!mounted) {
          setMounted(true);
          addTrail("m;");
        }
        return useMemo(() => ({ trail, addTrail }), [trail]);
      };

      function App() {
        const state = useInWorld(world, useTrail);
        api = state;
        return <div data-testid="out">{state.trail}</div>;
      }

      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      const afterMount = screen.getByTestId("out").textContent!;

      // A regular dispatch to the same cell after the render-phase update
      // committed. The flush's rollback restores the cell's committed state;
      // the render-phase update must be part of it.
      await act(async () => {
        api.addTrail("X;");
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      return [afterMount, screen.getByTestId("out").textContent!];
    };

    const reactLog = await run("react");
    cleanup();
    const tapLog = await run("tap");

    expect(reactLog).toEqual(["m;", "m;X;"]);
    expect(tapLog).toEqual(reactLog);
  });
});
