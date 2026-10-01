// @vitest-environment jsdom

import { act } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import type { LangChainMessage } from "./types";

const { controllerCreated } = vi.hoisted(() => ({
  controllerCreated: vi.fn(),
}));
vi.mock("@assistant-ui/core/internal", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/core/internal")>();
  return {
    ...original,
    createAbortableThreadLoad: () => {
      controllerCreated();
      return original.createAbortableThreadLoad();
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
const { cleanup, render, renderHook, waitFor } =
  await import("@testing-library/react");

afterEach(() => {
  cleanup();
  renderer?.setRefreshHandler(() => undefined);
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const adapter: RemoteThreadListAdapter = {
  list: async () => ({
    threads: [
      {
        status: "regular",
        remoteId: "thread-1",
        externalId: "thread-1",
        title: "Thread",
      },
    ],
  }),
  initialize: async () => ({ remoteId: "thread-1", externalId: "thread-1" }),
  rename: async () => {},
  archive: async () => {},
  unarchive: async () => {},
  delete: async () => {},
  generateTitle: async () => new ReadableStream(),
  fetch: async () => ({
    status: "regular",
    remoteId: "thread-1",
    externalId: "thread-1",
  }),
};

let rendered = "";

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
  expect(rendered).toBe("after");
};

const Observer = () => {
  useAui();
  return null;
};

const mountParent = async () => {
  const stream = vi.fn(async function* () {});
  const parent = renderHook(() =>
    useLangGraphRuntime({ stream, unstable_threadListAdapter: adapter }),
  );
  render(
    <AssistantRuntimeProvider runtime={parent.result.current}>
      <Observer />
    </AssistantRuntimeProvider>,
  );
  act(() => {
    void parent.result.current.threads.switchToThread("thread-1");
  });
  await waitFor(() =>
    expect(parent.result.current.threads.getState().mainThreadId).toBe(
      "thread-1",
    ),
  );
  return parent.result.current;
};

it("pins the thread load controller across Fast Refresh", async () => {
  const pending = deferred<{ messages: LangChainMessage[] }>();
  const load = vi.fn(
    (_id: string, _config?: { signal: AbortSignal }) => pending.promise,
  );
  const stream = vi.fn(async function* () {});
  let runtime!: ReturnType<typeof useLangGraphRuntime>;
  const host = (label: string) => () => {
    rendered = label;
    runtime = useLangGraphRuntime({
      stream,
      load,
      unstable_threadListAdapter: adapter,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Observer />
      </AssistantRuntimeProvider>
    );
  };
  const Before = host("before");
  const After = host("after");
  const parent = await mountParent();
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      <Before />
    </AssistantRuntimeProvider>,
  );
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  const createdBefore = controllerCreated.mock.calls.length;

  await refresh(Before, After);
  expect(controllerCreated).toHaveBeenCalledTimes(createdBefore);

  view.unmount();
  await act(async () => {});
});

it("keeps an in-flight thread load and lands its history after Fast Refresh", async () => {
  const pending = deferred<{ messages: LangChainMessage[] }>();
  const load = vi.fn(
    (_id: string, _config?: { signal: AbortSignal }) => pending.promise,
  );
  const stream = vi.fn(async function* () {});
  let runtime!: ReturnType<typeof useLangGraphRuntime>;
  const host = (label: string) => () => {
    rendered = label;
    runtime = useLangGraphRuntime({
      stream,
      load,
      unstable_threadListAdapter: adapter,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Observer />
      </AssistantRuntimeProvider>
    );
  };
  const Before = host("before");
  const After = host("after");
  const parent = await mountParent();
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      <Before />
    </AssistantRuntimeProvider>,
  );
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  const signal = load.mock.calls[0]![1]!.signal;

  await refresh(Before, After);
  expect(signal.aborted).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve({
      messages: [{ id: "history-1", type: "human", content: "saved" }],
    });
  });
  await waitFor(() =>
    expect(
      runtime.thread.getState().messages.map(getThreadMessageText),
    ).toContain("saved"),
  );

  view.unmount();
  await act(async () => {});
});

it("aborts an in-flight thread load on real unmount", async () => {
  const load = vi.fn(
    (_id: string, _config?: { signal: AbortSignal }) =>
      new Promise<never>(() => {}),
  );
  const stream = vi.fn(async function* () {});
  let runtime!: ReturnType<typeof useLangGraphRuntime>;
  const parent = await mountParent();
  const Host = () => {
    runtime = useLangGraphRuntime({
      stream,
      load,
      unstable_threadListAdapter: adapter,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Observer />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      <Host />
    </AssistantRuntimeProvider>,
  );
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  const signal = load.mock.calls[0]![1]!.signal;
  view.unmount();
  await act(async () => {});
  expect(signal.aborted).toBe(true);
});

it("keeps a streaming run and queued tool-result resume across Fast Refresh", async () => {
  const gate = deferred<void>();
  const signals: AbortSignal[] = [];
  const stream = vi.fn(async function* (
    _messages: LangChainMessage[],
    config: { abortSignal: AbortSignal },
  ) {
    signals.push(config.abortSignal);
    if (signals.length === 1) {
      yield {
        event: "messages/complete" as const,
        data: [
          {
            id: "ai-1",
            type: "ai" as const,
            content: "",
            tool_calls: [
              { id: "tc-1", name: "get_weather", args: { city: "sf" } },
            ],
          },
        ],
      };
      await gate.promise;
    }
  });
  let runtime!: ReturnType<typeof useLangGraphRuntime>;
  const host = (label: string) => () => {
    rendered = label;
    runtime = useLangGraphRuntime({ stream });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Observer />
      </AssistantRuntimeProvider>
    );
  };
  const Before = host("before");
  const After = host("after");
  const parent = await mountParent();
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      <Before />
    </AssistantRuntimeProvider>,
  );
  act(() => runtime.thread.append("weather?"));
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      runtime.thread.getMessageById("ai-1").getState().content,
    ).toContainEqual(
      expect.objectContaining({ type: "tool-call", toolCallId: "tc-1" }),
    ),
  );
  act(() =>
    runtime.thread
      .getMessageById("ai-1")
      .getMessagePartByToolCallId("tc-1")
      .addToolResult({ temperature: 72 }),
  );
  expect(stream).toHaveBeenCalledTimes(1);

  await refresh(Before, After);
  expect(signals[0]!.aborted).toBe(false);
  await act(async () => {
    gate.resolve();
  });
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
  expect(stream.mock.calls[1]?.[0]).toMatchObject([
    { type: "tool", tool_call_id: "tc-1", status: "success" },
  ]);

  view.unmount();
  await act(async () => {});
});

it("aborts a streaming run on real unmount", async () => {
  const stream = vi.fn(async function* (
    _messages: LangChainMessage[],
    config: { abortSignal: AbortSignal },
  ) {
    yield {
      event: "metadata" as const,
      data: { thread_id: "thread-1", run_attempt: 1 },
    };
    await new Promise<never>(() => {});
    return config;
  });
  let runtime!: ReturnType<typeof useLangGraphRuntime>;
  const Host = () => {
    runtime = useLangGraphRuntime({ stream });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Observer />
      </AssistantRuntimeProvider>
    );
  };
  const parent = await mountParent();
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      <Host />
    </AssistantRuntimeProvider>,
  );
  act(() => runtime.thread.append("hello"));
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  const signal = stream.mock.calls[0]![1].abortSignal;
  view.unmount();
  await act(async () => {});
  expect(signal.aborted).toBe(true);
});
