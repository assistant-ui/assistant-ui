// @vitest-environment jsdom

import { act, Activity, version, type ComponentType } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { HttpAgent } from "@ag-ui/client";
import type {
  AssistantRuntime,
  MessageQueueController,
} from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./runtime/AgUiThreadRuntimeCore";
import type { UseAgUiRuntimeOptions } from "./runtime/types";
import { useAgUiRuntime, type AgUiAssistantRuntime } from "./useAgUiRuntime";

const onReact18 = version.startsWith("18.");

const base = vi.hoisted(() => ({ version: 0 }));
const queue = vi.hoisted(() => ({
  controller: null as MessageQueueController | null,
  busy: vi.fn(),
  idle: vi.fn(),
}));
vi.mock("@assistant-ui/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/core")>();
  return {
    ...actual,
    createMessageQueue: (
      ...args: Parameters<typeof actual.createMessageQueue>
    ) => {
      const controller = actual.createMessageQueue(...args);
      queue.controller = {
        ...controller,
        notifyBusy: () => {
          queue.busy();
          controller.notifyBusy();
        },
        notifyIdle: () => {
          queue.idle();
          controller.notifyIdle();
        },
      };
      return queue.controller;
    },
  };
});
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
  queue.controller = null;
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

it("emits queue edges once across refresh and dispatches the queued message", async () => {
  let finishFirst!: () => void;
  const firstRun = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  const runAgent = vi.fn(
    async (_input: unknown, subscriber: { onRunFinalized?: () => void }) => {
      if (runAgent.mock.calls.length === 1) await firstRun;
      subscriber.onRunFinalized?.();
    },
  );
  options = {
    agent: { runAgent, abortRun: vi.fn() } as unknown as HttpAgent,
    unstable_enableMessageQueue: true,
  };
  const { Before, After } = createProbe();
  const view = render(<Before />);
  expect(queue.idle).toHaveBeenCalledTimes(1);

  await act(async () => {
    await runtime.thread.append({
      role: "user",
      content: [{ type: "text", text: "first" }],
    });
  });
  await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(1));
  expect(queue.busy).toHaveBeenCalledTimes(1);

  await act(async () => {
    await runtime.thread.append({
      role: "user",
      content: [{ type: "text", text: "second" }],
      parentId: runtime.thread.getState().messages.at(-1)?.id ?? null,
    });
  });
  expect(runAgent).toHaveBeenCalledTimes(1);
  expect(
    [
      ...queue.controller!.adapter.items,
      ...queue.controller!.adapter.steerItems,
    ].map((item) => item.prompt),
  ).toEqual(["second"]);

  await refresh(Before, After);
  expect(queue.busy).toHaveBeenCalledTimes(1);
  expect(queue.idle).toHaveBeenCalledTimes(1);

  await act(async () => {
    finishFirst();
    await firstRun;
  });
  await waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect([
      ...queue.controller!.adapter.items,
      ...queue.controller!.adapter.steerItems,
    ]).toHaveLength(0),
  );
  await waitFor(() => expect(queue.busy).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(queue.idle).toHaveBeenCalledTimes(3));

  await refresh(Before, After);
  expect(queue.busy).toHaveBeenCalledTimes(2);
  expect(queue.idle).toHaveBeenCalledTimes(3);

  const firstController = queue.controller;
  options = { ...options, unstable_enableMessageQueue: false };
  view.rerender(<After />);
  options = { ...options, unstable_enableMessageQueue: true };
  view.rerender(<After />);
  expect(queue.controller).not.toBe(firstController);
  expect(queue.idle).toHaveBeenCalledTimes(4);
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
