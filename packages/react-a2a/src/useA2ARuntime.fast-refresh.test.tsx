// @vitest-environment jsdom

import { act, Activity, version } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "@assistant-ui/core";
import { A2AClient } from "./A2AClient";
import { A2AThreadRuntimeCore } from "./A2AThreadRuntimeCore";
import type { UseA2ARuntimeOptions } from "./types";
import { useA2ARuntime } from "./useA2ARuntime";

const onReact18 = version.startsWith("18.");

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
});
afterAll(() => vi.unstubAllGlobals());

let options: UseA2ARuntimeOptions;
let runtime: AssistantRuntime;
const createProbe = () => {
  const Before = () => {
    runtime = useA2ARuntime(options);
    return null;
  };
  const After = () => {
    runtime = useA2ARuntime(options);
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

it("keeps the managed client and core across refresh, then replaces both when options change", async () => {
  vi.spyOn(A2AClient.prototype, "getAgentCard").mockResolvedValue(
    {} as Awaited<ReturnType<A2AClient["getAgentCard"]>>,
  );
  const attach = vi.spyOn(A2AThreadRuntimeCore.prototype, "attachRuntime");
  const update = vi.spyOn(A2AThreadRuntimeCore.prototype, "updateOptions");
  options = { baseUrl: "https://first.example" };
  const { Before, After } = createProbe();
  const view = render(<Before />);
  const firstCore = attach.mock.instances[0]! as A2AThreadRuntimeCore;
  const firstClient = update.mock.lastCall![0].client;

  await refresh(Before, After);
  expect(attach.mock.instances.at(-1)).toBe(firstCore);
  expect(update.mock.lastCall![0].client).toBe(firstClient);
  expect(firstCore.getRuntime()).toBe(runtime);

  options = { baseUrl: "https://second.example" };
  view.rerender(<After />);
  await act(async () => {});
  expect(attach.mock.instances.at(-1)).not.toBe(firstCore);
  expect(update.mock.lastCall![0].client).not.toBe(firstClient);
});

const keepsStreamAcrossRefresh = async (
  exit: "hidden" | "unmount",
  inActivity: boolean,
) => {
  let signal: AbortSignal | undefined;
  const client = {
    getAgentCard: vi.fn().mockResolvedValue(undefined),
    streamMessage: vi.fn((_message, _configuration, _metadata, runSignal) => {
      signal = runSignal as AbortSignal;
      return {
        async *[Symbol.asyncIterator]() {
          await new Promise<void>((resolve) =>
            signal!.addEventListener("abort", () => resolve(), {
              once: true,
            }),
          );
        },
      };
    }),
  } as unknown as A2AClient;
  const attach = vi.spyOn(A2AThreadRuntimeCore.prototype, "attachRuntime");
  const detach = vi.spyOn(A2AThreadRuntimeCore.prototype, "detachRuntime");
  options = { client };
  const { Before, After } = createProbe();
  const Shell = ({ mode }: { mode: "visible" | "hidden" }) => (
    <Activity mode={mode}>
      <Before />
    </Activity>
  );
  const view = render(inActivity ? <Shell mode="visible" /> : <Before />);
  const core = attach.mock.instances[0]!;
  act(() => {
    void runtime.thread.append("hello");
  });
  await waitFor(() => expect(client.streamMessage).toHaveBeenCalledOnce());

  await refresh(Before, After);
  expect(signal?.aborted).toBe(false);
  expect(detach).not.toHaveBeenCalled();
  expect(attach.mock.instances.at(-1)).toBe(core);

  if (exit === "hidden") view.rerender(<Shell mode="hidden" />);
  else view.unmount();
  await act(async () => {});
  expect(detach).toHaveBeenCalledOnce();
  expect(signal?.aborted).toBe(true);
};

// Activity is React 19 only
it.skipIf(onReact18)(
  "keeps an in-flight stream across refresh and detaches when hidden",
  () => keepsStreamAcrossRefresh("hidden", true),
);

// Activity is React 19 only
it.skipIf(onReact18)(
  "keeps an in-flight stream across refresh and detaches when unmounted inside Activity",
  () => keepsStreamAcrossRefresh("unmount", true),
);

it("keeps an in-flight stream across refresh and detaches when unmounted", () =>
  keepsStreamAcrossRefresh("unmount", false));
