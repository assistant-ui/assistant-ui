// @vitest-environment jsdom

import { Activity, act } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { ThreadRuntimeImpl } from "../../runtime/api/thread-runtime";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import { captureThreadRuntimeGeneration } from "../../runtime/utils/thread-runtime-lifecycle";
import type { ThreadMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

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

it("dispatches an in-flight append through a Fast Refresh and invalidates on unmount", async () => {
  const onNew = vi.fn(async () => {});
  let runtime!: AssistantRuntime;
  const Before = () => {
    runtime = useExternalStoreRuntime<ThreadMessage>({ messages: [], onNew });
    return null;
  };
  const After = () => {
    runtime = useExternalStoreRuntime<ThreadMessage>({ messages: [], onNew });
    return null;
  };
  const view = render(<Before />);
  const core = (
    runtime.thread as ThreadRuntimeImpl
  ).__internal_threadBinding.getState();
  const generation = captureThreadRuntimeGeneration(core);
  await act(async () => {
    runtime.thread.append("hello");
    refresh(Before, After);
  });
  expect(onNew).toHaveBeenCalledOnce();
  expect(generation.aborted).toBe(false);

  view.unmount();
  expect(generation.aborted).toBe(false);
  await act(async () => {});
  expect(generation.aborted).toBe(true);
});

it("keeps a pending history copy through a Fast Refresh and detaches on Activity hide", async () => {
  const message = {
    id: "assistant-1",
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "choose",
        args: {},
        argsText: "{}",
      },
    ],
    status: { type: "complete", reason: "stop" },
    createdAt: new Date(0),
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  } as ThreadMessage;
  const unstable_copy = vi.fn(async () => {});
  const history: ThreadHistoryAdapter = {
    load: async () => ExportedMessageRepository.fromArray([]),
    append: async () => {},
    unstable_copy,
  };
  let runtime!: AssistantRuntime;
  const Before = () => {
    runtime = useExternalStoreRuntime({
      messages: [message],
      onNew: async () => {},
    });
    return null;
  };
  const After = () => {
    runtime = useExternalStoreRuntime({
      messages: [message],
      onNew: async () => {},
    });
    return null;
  };
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <RuntimeAdapterProvider adapters={{ history }}>
        <Before />
      </RuntimeAdapterProvider>
    </Activity>
  );
  const view = render(tree("visible"));
  const generation = captureThreadRuntimeGeneration(
    (runtime.thread as ThreadRuntimeImpl).__internal_threadBinding.getState(),
  );
  const record = () =>
    runtime.thread
      .getMessageById("assistant-1")
      .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
      type: "action",
      payload: {},
    });
  const pending = record();
  const firstResult = pending.then(
    () => "copied",
    () => "detached",
  );
  await act(async () => refresh(Before, After));
  expect(await firstResult).toBe("copied");
  expect(unstable_copy).toHaveBeenCalledOnce();

  const second = record();
  const result = second.then(
    () => "copied",
    () => "detached",
  );
  act(() => view.rerender(tree("hidden")));
  expect(generation.aborted).toBe(false);
  await act(async () => {});
  expect(await result).toBe("detached");
  expect(generation.aborted).toBe(true);
});
