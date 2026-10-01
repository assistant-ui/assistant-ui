// @vitest-environment jsdom

import { act, Activity, version, type ComponentType } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { HttpAgent } from "@ag-ui/client";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";
import type { UseAgUiRuntimeOptions } from "./runtime/types";
import { useAgUiRuntime, type AgUiAssistantRuntime } from "./useAgUiRuntime";

const onReact18 = version.startsWith("18.");

const base = vi.hoisted(() => ({ version: 0 }));
vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  const derived = new WeakMap<AssistantRuntime, AssistantRuntime>();
  return {
    ...actual,
    useExternalStoreRuntime: (
      store: Parameters<typeof actual.useExternalStoreRuntime>[0],
    ) => {
      const runtime = actual.useExternalStoreRuntime(store);
      if (base.version === 0) return runtime;
      let next = derived.get(runtime);
      if (!next) {
        next = Object.create(runtime) as AssistantRuntime;
        derived.set(runtime, next);
      }
      return next;
    },
  };
});

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
const { cleanup, render, waitFor } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
  fiberRoots.clear();
  vi.restoreAllMocks();
  base.version = 0;
});
afterAll(() => vi.unstubAllGlobals());

let options: UseAgUiRuntimeOptions;
let runtime: AgUiAssistantRuntime;
const createProbe = () => {
  const Before = () => {
    runtime = useAgUiRuntime(options);
    return null;
  };
  const After = () => {
    runtime = useAgUiRuntime(options);
    return null;
  };
  return { Before, After };
};

const refresh = async (Before: unknown, After: unknown) => {
  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const root of fiberRoots) {
      renderer!.scheduleRefresh(root, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});
};

it("keeps the wrapper across refresh and replaces it when the base runtime changes", async () => {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  options = { agent };
  const { Before, After } = createProbe();
  const view = render(<Before />);
  const wrapper = runtime;
  await refresh(Before, After);
  expect(runtime).toBe(wrapper);

  base.version = 1;
  view.rerender(<After />);
  await act(async () => {});
  expect(runtime).not.toBe(wrapper);
});

const expectInFlightRunAcrossRefresh = async (
  exit: "hidden" | "unmount",
  inActivity: boolean,
) => {
  let resolveRun!: () => void;
  const run = new Promise<void>((resolve) => {
    resolveRun = resolve;
  });
  const agent = {
    runAgent: vi.fn(() => run),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const attach = vi.spyOn(AgUiThreadRuntimeCore.prototype, "attachRuntime");
  const detach = vi.spyOn(AgUiThreadRuntimeCore.prototype, "detachRuntime");
  options = { agent };
  const { Before, After } = createProbe();
  const Shell: ComponentType<{ mode: "visible" | "hidden" }> = inActivity
    ? ({ mode }) => (
        <Activity mode={mode}>
          <Before />
        </Activity>
      )
    : () => <Before />;
  const view = render(<Shell mode="visible" />);
  const wrapper = runtime;
  const core = attach.mock.instances[0]!;
  act(() => {
    void runtime.thread.append("hello");
  });
  await waitFor(() => expect(agent.runAgent).toHaveBeenCalledOnce());

  await refresh(Before, After);
  expect(agent.abortRun).not.toHaveBeenCalled();
  expect(detach).not.toHaveBeenCalled();
  expect(runtime).toBe(wrapper);
  expect(attach.mock.instances.at(-1)).toBe(core);

  if (exit === "hidden") view.rerender(<Shell mode="hidden" />);
  else view.unmount();
  await act(async () => {});
  expect(detach).toHaveBeenCalledOnce();
  expect(agent.abortRun).toHaveBeenCalledOnce();
  resolveRun();
  await act(async () => {
    await run;
  });
};

// Activity is React 19 only.
it.skipIf(onReact18).each(["hidden", "unmount"] as const)(
  "keeps an in-flight run across refresh and detaches when %s",
  (exit) => expectInFlightRunAcrossRefresh(exit, true),
);

it("keeps an in-flight run across refresh and detaches when unmounted outside an Activity", () =>
  expectInFlightRunAcrossRefresh("unmount", false));
