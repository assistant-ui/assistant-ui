// @vitest-environment jsdom

import { Activity, StrictMode, act } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { useReplaySafeEffect } from "./useReplaySafeEffect";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

let renderer: RendererInternals | undefined;
const fiberRoots = new Set<unknown>();
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal("__REACT_DEVTOOLS_GLOBAL_HOOK__", {
  supportsFiber: true,
  inject: (internals: RendererInternals) => {
    renderer = internals;
    return 1;
  },
  onScheduleFiberRoot: () => {},
  onCommitFiberRoot: (_id: number, root: unknown) => fiberRoots.add(root),
  onCommitFiberUnmount: () => {},
});
const { cleanup, render } = await import("@testing-library/react");

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

it("sets up once without cleanup during StrictMode mount", async () => {
  const events: string[] = [];
  const App = () => {
    useReplaySafeEffect(() => {
      events.push("setup");
      return () => events.push("cleanup");
    }, []);
    return null;
  };
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await act(async () => {});
  expect(events).toEqual(["setup"]);
});

it("keeps the same setup across a real Fast Refresh", async () => {
  const events: string[] = [];
  const Before = () => {
    useReplaySafeEffect(() => {
      events.push("setup");
      return () => events.push("cleanup");
    }, []);
    return null;
  };
  const After = () => {
    useReplaySafeEffect(() => {
      events.push("replacement setup");
      return () => events.push("replacement cleanup");
    }, []);
    return null;
  };
  const view = render(<Before />);
  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const fiberRoot of fiberRoots) {
      renderer!.scheduleRefresh(fiberRoot, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  expect(events).toEqual(["setup"]);
  view.unmount();
  await act(async () => {});
  expect(events).toEqual(["setup", "cleanup"]);
});

it("cleans up old deps before setting up new deps exactly once", async () => {
  const events: string[] = [];
  const App = ({ value }: { value: number }) => {
    useReplaySafeEffect(() => {
      events.push(`setup ${value}`);
      return () => events.push(`cleanup ${value}`);
    }, [value]);
    return null;
  };
  const view = render(<App value={1} />);
  view.rerender(<App value={2} />);
  await act(async () => {});
  expect(events).toEqual(["setup 1", "cleanup 1", "setup 2"]);
});

it("cleans up an unmount after a microtask", async () => {
  const cleanupEffect = vi.fn();
  const App = () => {
    useReplaySafeEffect(() => cleanupEffect, []);
    return null;
  };
  const view = render(<App />);
  view.unmount();
  expect(cleanupEffect).not.toHaveBeenCalled();
  await act(async () => {});
  expect(cleanupEffect).toHaveBeenCalledOnce();
});

it("cleans up an Activity hide after a microtask and sets up on reveal", async () => {
  const events: string[] = [];
  const App = () => {
    useReplaySafeEffect(() => {
      events.push("setup");
      return () => events.push("cleanup");
    }, []);
    return null;
  };
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <App />
    </Activity>
  );
  const view = render(tree("visible"));
  act(() => view.rerender(tree("hidden")));
  expect(events).toEqual(["setup"]);
  await act(async () => {});
  expect(events).toEqual(["setup", "cleanup"]);
  act(() => view.rerender(tree("visible")));
  expect(events).toEqual(["setup", "cleanup", "setup"]);
});
