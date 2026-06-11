/**
 * The remaining (deliberate or structural) divergences between React and
 * tap; see DIVERGENCES.md for the full rationale. Each test pins the CURRENT
 * behavior of BOTH sides so a change in either direction is caught:
 *
 *  - tap's eager dispatch bailout is more aggressive than React's: no stale
 *    lanes, so a same-value dispatch right after an update skips the render
 *    React still does, and no-change renders commit no-deps effects.
 *  - Bridge dispatches ride the host's React reducer: a fully bailable
 *    dispatch renders the host once where React and tap roots render nothing.
 *  - useLayoutEffect collapses onto useEffect (no layout phase).
 *  - Dispatch after unmount applies, like an Activity hide: tap cannot
 *    distinguish a hide from a deletion. Do NOT add an isMounted guard.
 */
/* oxlint-disable react/exhaustive-deps -- intentional missing-dep patterns are part of the scenarios */
import { describe, it, expect } from "vitest";
import { useEffect, useLayoutEffect, useReducer, useState } from "react";
import {
  isDevMode,
  runScenario,
  TAP_ENVS,
  type Scenario,
} from "./describeParity";

const countOf = (events: string[], entry: string) =>
  events.filter((e) => e === entry).length;

/** Body invocations per committed render pass (dev double-invokes). */
const perRender = isDevMode ? 2 : 1;

describe("divergence: eager dispatch bailout is more aggressive than React's", () => {
  it("same-value dispatch right after an update: React renders once more; tap roots bail", async () => {
    // React's eager bailout needs idle lanes on the fiber AND its alternate;
    // a committed update leaves the alternate's lanes stale, so the next
    // same-value dispatch still renders (a bailout render that clears them).
    // tap bails on Object.is equality whenever its batch is empty: strictly
    // fewer renders, identical state. Matching React exactly takes a lanes
    // emulation (dirty bit + bailout-render detection + effect suppression +
    // args guard); it was implemented and reverted as not worth the hot-path
    // complexity, since only impure updaters and render bodies can observe
    // the difference.
    const scenario: Scenario = {
      name: "",
      use: (log) => {
        const [count, setCount] = useState(0);
        log(`render ${count}`);
        return { set: (n: number) => setCount(n) };
      },
      drive: async ({ api, act }) => {
        await act(() => api().set(1));
        await act(() => api().set(1));
      },
    };

    const react = await runScenario("react", scenario);
    expect(countOf(react, "render 1")).toBe(2 * perRender);

    for (const env of ["tapRoot", "createTapRoot"] as const) {
      const tap = await runScenario(env, scenario);
      expect(countOf(tap, "render 1")).toBe(perRender);
    }

    const bridge = await runScenario("bridge", scenario);
    expect(bridge).toEqual(react);
  });

  it("no-change render: React strips no-deps effects (bailoutHooks); tap commits them", async () => {
    // Consistent with tap's whole-tree re-renders, which refire no-deps
    // effects on every update anyway.
    const scenario: Scenario = {
      name: "",
      use: (log) => {
        const [state, dispatch] = useReducer((s: number) => s, 42);
        log(`render ${state}`);
        useEffect(() => {
          log("effect");
          return () => log("cleanup");
        });
        return { dispatch };
      },
      drive: async ({ api, act }) => {
        await act(() => api().dispatch(0));
      },
    };

    const react = await runScenario("react", scenario);

    for (const env of TAP_ENVS) {
      const tap = await runScenario(env, scenario);
      expect(countOf(tap, "render 42")).toBe(countOf(react, "render 42"));
      expect(countOf(tap, "effect")).toBe(countOf(react, "effect") + 1);
      expect(countOf(tap, "cleanup")).toBe(countOf(react, "cleanup") + 1);
    }
  });
});

describe("divergence: fully-bailable dispatch renders the bridge host once", () => {
  const scenario: Scenario = {
    name: "",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      return { set: (n: number) => setCount(n) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().set(0));
    },
  };

  it("React and tap roots bail without rendering; the bridge renders once", async () => {
    const react = await runScenario("react", scenario);
    expect(countOf(react, "render 0")).toBe(perRender);

    for (const env of ["tapRoot", "createTapRoot"] as const) {
      const tap = await runScenario(env, scenario);
      expect(tap).toEqual(react);
    }

    const bridge = await runScenario("bridge", scenario);
    expect(countOf(bridge, "render 0")).toBe(2 * perRender);
  });
});

describe("divergence: dispatch from an unmount cleanup applies (Activity semantics)", () => {
  const scenario: Scenario = {
    name: "",
    use: (log) => {
      const [count, setCount] = useState(0);
      log(`render ${count}`);
      useEffect(() => {
        log(`mount ${count}`);
        return () => {
          log(`cleanup ${count}`);
          setCount(99);
        };
      }, []);
    },
    unmountAtEnd: true,
  };

  it("React drops it (deletion); tap roots apply it like an Activity hide", async () => {
    const react = await runScenario("react", scenario);
    const bridge = await runScenario("bridge", scenario);
    expect(bridge).toEqual(react);

    if (isDevMode) {
      // In dev the strict remount cycle runs the cleanup while still mounted,
      // so even React renders 99 during mount.
      expect(react).toContain("render 99");
    } else {
      expect(react).not.toContain("render 99");
    }

    for (const env of ["tapRoot", "createTapRoot"] as const) {
      const tap = await runScenario(env, scenario);
      if (isDevMode) {
        // The strict remount cycle already set 99 while mounted; the unmount
        // dispatch then bails eagerly on equality, masking the divergence.
        expect(tap).toEqual(react);
      } else {
        // tap cannot distinguish this deletion from an Activity-style hide,
        // so the update applies and the (pure) render runs; effects stay off.
        expect(tap).toEqual([...react, "render 99"]);
      }
    }
  });
});

describe("divergence: useLayoutEffect is an alias for useEffect", () => {
  const scenario: Scenario = {
    name: "",
    use: (log) => {
      const [n, setN] = useState(0);
      useEffect(() => {
        log(`passive n=${n}`);
        return () => log(`passive-cleanup n=${n}`);
      }, [n]);
      useLayoutEffect(() => {
        log(`layout n=${n}`);
        return () => log(`layout-cleanup n=${n}`);
      }, [n]);
      return { bump: () => setN((c) => c + 1) };
    },
    drive: async ({ api, act }) => {
      await act(() => api().bump());
    },
  };

  it("React runs the layout phase first; tap runs call order", async () => {
    const react = await runScenario("react", scenario);
    expect(react.slice(-4)).toEqual([
      "layout-cleanup n=0",
      "layout n=1",
      "passive-cleanup n=0",
      "passive n=1",
    ]);

    for (const env of TAP_ENVS) {
      const tap = await runScenario(env, scenario);
      expect(tap.slice(-4)).toEqual([
        "passive-cleanup n=0",
        "layout-cleanup n=0",
        "passive n=1",
        "layout n=1",
      ]);
    }
  });
});
