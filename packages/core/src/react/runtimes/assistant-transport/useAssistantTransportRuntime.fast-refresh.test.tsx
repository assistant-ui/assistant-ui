// @vitest-environment jsdom

import { act, startTransition } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { useReplayRenderWait } from "./replayBoundaryStream";
import { useRunManager } from "./runManager";

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
const { flushSync } = await import("react-dom");
const { cleanup, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(() => vi.unstubAllGlobals());

const refresh = (before: unknown, after: unknown) => {
  const family: Family = { current: after };
  renderer!.setRefreshHandler((type) =>
    type === before || type === after ? family : undefined,
  );
  for (const fiberRoot of fiberRoots) {
    renderer!.scheduleRefresh(fiberRoot, {
      staleFamilies: new Set(),
      updatedFamilies: new Set([family]),
    });
  }
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

it("keeps an in-flight run and coalesced follow-up through Fast Refresh, then aborts on unmount", async () => {
  const first = deferred();
  const second = deferred();
  const onRun = vi
    .fn()
    .mockImplementationOnce(async () => first.promise)
    .mockImplementationOnce(async () => second.promise);
  const onFinish = vi.fn();
  const onCancel = vi.fn();
  let manager!: ReturnType<typeof useRunManager>;
  const useManager = () => {
    manager = useRunManager({ onRun, onFinish, onCancel });
  };
  const Before = () => {
    useManager();
    return null;
  };
  const After = () => {
    useManager();
    return null;
  };
  const view = render(<Before />);

  act(() => manager.schedule());
  await act(async () => {});
  expect(onRun).toHaveBeenCalledOnce();
  const signal = onRun.mock.calls[0]![0] as AbortSignal;
  act(() => manager.schedule());

  await act(async () => refresh(Before, After));
  expect(signal.aborted).toBe(false);
  expect(onCancel).not.toHaveBeenCalled();

  await act(async () => first.resolve());
  expect(onFinish).toHaveBeenCalledOnce();
  expect(onRun).toHaveBeenCalledTimes(2);
  const followUpSignal = onRun.mock.calls[1]![0] as AbortSignal;
  expect(followUpSignal.aborted).toBe(false);

  view.unmount();
  await act(async () => {});
  expect(followUpSignal.aborted).toBe(true);
  await act(async () => second.resolve());
});

it("keeps a render waiter pending through Fast Refresh until its ticket commits, then releases it on unmount", async () => {
  vi.useFakeTimers();
  let waitForRender!: ReturnType<typeof useReplayRenderWait>;
  const useWaiter = () => {
    waitForRender = useReplayRenderWait();
  };
  const Before = () => {
    useWaiter();
    return null;
  };
  const After = () => {
    useWaiter();
    return null;
  };
  const view = render(<Before />);
  let resolved = false;
  const wait = waitForRender().then(() => {
    resolved = true;
  });

  startTransition(() => {
    vi.runOnlyPendingTimers();
  });
  flushSync(() => refresh(Before, After));
  await Promise.resolve();
  expect(resolved).toBe(false);

  await act(async () => {});
  await wait;
  expect(resolved).toBe(true);

  let releasedOnUnmount = false;
  const unmountWait = waitForRender().then(() => {
    releasedOnUnmount = true;
  });
  vi.runOnlyPendingTimers();
  view.unmount();
  await act(async () => {});
  await unmountWait;
  expect(releasedOnUnmount).toBe(true);
});
