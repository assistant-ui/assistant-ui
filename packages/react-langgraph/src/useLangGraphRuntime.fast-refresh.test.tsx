// @vitest-environment jsdom

import { act, Activity, StrictMode, useEffect } from "react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { afterAll, afterEach, expect, it, vi } from "vitest";

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
const { AssistantRuntimeProvider } = await import("@assistant-ui/core/react");
const { useLangGraphRuntime } = await import("./useLangGraphRuntime");
const { useLangGraphMessages } = await import("./useLangGraphMessages");
const { appendLangChainChunk } = await import("./appendLangChainChunk");

afterEach(() => {
  cleanup();
  renderer?.setRefreshHandler(() => undefined);
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

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

const threadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-1",
        externalId: "thread-1",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
});

const renderParent = () => {
  const parent = renderHook(() =>
    useLangGraphRuntime({
      stream: vi.fn(async function* () {}),
      unstable_threadListAdapter: threadListAdapter(),
    }),
  );
  return parent.result.current;
};

const mountParent = async () => {
  const parent = renderParent();
  const view = render(
    <AssistantRuntimeProvider runtime={parent}>
      {null}
    </AssistantRuntimeProvider>,
  );
  await act(async () => {
    await parent.threads.switchToThread("thread-1");
  });
  return { parent, view };
};

it.each(["unmount", "hide"] as const)(
  "keeps a streaming run through Fast Refresh and cancels on %s",
  async (teardown) => {
    let signal: AbortSignal | undefined;
    let runtime: AssistantRuntime | undefined;
    let rendered: string | undefined;
    const stream = vi.fn((_messages, config: { abortSignal: AbortSignal }) => {
      signal = config.abortSignal;
      return new Promise<never>(() => {});
    });
    const host = (name: string) => () => {
      rendered = name;
      runtime = useLangGraphRuntime({ stream: stream as never });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const Before = host("before");
    const After = host("after");
    const view = render(
      <Activity mode="visible">
        <Before />
      </Activity>,
    );

    act(() => {
      void runtime!.thread.append("hello");
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
    expect(runtime!.thread.getState().isRunning).toBe(true);

    await refresh(Before, After);
    expect(rendered).toBe("after");
    expect(signal!.aborted).toBe(false);
    expect(runtime!.thread.getState().isRunning).toBe(true);
    expect(stream).toHaveBeenCalledTimes(1);

    if (teardown === "hide") {
      await act(async () => {
        view.rerender(
          <Activity mode="hidden">
            <Before />
          </Activity>,
        );
      });
    } else {
      view.unmount();
    }
    await act(async () => {});
    expect(signal!.aborted).toBe(true);
  },
);

it("keeps a direct useLangGraphMessages stream through Fast Refresh and cancels on unmount", async () => {
  let signal: AbortSignal | undefined;
  let send: (() => void) | undefined;
  let rendered: string | undefined;
  const stream = vi.fn((_messages, config: { abortSignal: AbortSignal }) => {
    signal = config.abortSignal;
    return new Promise<never>(() => {});
  });
  const host = (name: string) => () => {
    rendered = name;
    const { sendMessage } = useLangGraphMessages({
      stream: stream as never,
      appendMessage: appendLangChainChunk,
    });
    send = () => {
      void sendMessage([{ type: "human", content: "hello" }], {});
    };
    return null;
  };
  const Before = host("before");
  const After = host("after");
  const view = render(<Before />);

  act(() => send!());
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  expect(signal!.aborted).toBe(false);

  await refresh(Before, After);
  expect(rendered).toBe("after");
  expect(signal!.aborted).toBe(false);
  expect(stream).toHaveBeenCalledTimes(1);

  view.unmount();
  await act(async () => {});
  expect(signal!.aborted).toBe(true);
});

it("keeps a stream started during StrictMode's effect replay", async () => {
  let signal: AbortSignal | undefined;
  let launched = false;
  const stream = vi.fn((_messages, config: { abortSignal: AbortSignal }) => {
    signal = config.abortSignal;
    return new Promise<never>(() => {});
  });
  const Host = () => {
    const { sendMessage } = useLangGraphMessages({
      stream: stream as never,
      appendMessage: appendLangChainChunk,
    });
    useEffect(() => {
      if (launched) return;
      launched = true;
      void sendMessage([{ type: "human", content: "hello" }], {});
    }, [sendMessage]);
    return null;
  };
  const view = render(
    <StrictMode>
      <Host />
    </StrictMode>,
  );
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  expect(signal!.aborted).toBe(false);
  view.unmount();
  await act(async () => {});
  expect(signal!.aborted).toBe(true);
});

it("starts one history load during StrictMode's effect replay", async () => {
  let signal: AbortSignal | undefined;
  const load = vi.fn((_id, options: { signal?: AbortSignal }) => {
    signal = options.signal;
    return new Promise<never>(() => {});
  });
  const Host = () => {
    const runtime = useLangGraphRuntime({
      stream: vi.fn(async function* () {}),
      load: load as never,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  const { parent, view } = await mountParent();
  await act(async () => {
    view.rerender(
      <AssistantRuntimeProvider runtime={parent}>
        <StrictMode>
          <Host />
        </StrictMode>
      </AssistantRuntimeProvider>,
    );
  });
  expect(load).toHaveBeenCalledTimes(1);
  expect(signal!.aborted).toBe(false);
});

it.each(["unmount", "hide"] as const)(
  "keeps an in-flight history load through Fast Refresh and aborts on %s",
  async (teardown) => {
    let signal: AbortSignal | undefined;
    let runtime: AssistantRuntime | undefined;
    let rendered: string | undefined;
    const load = vi.fn((_id, options: { signal?: AbortSignal }) => {
      signal = options.signal;
      return new Promise<never>(() => {});
    });
    const adapter = threadListAdapter();
    const host = (name: string) => () => {
      rendered = name;
      runtime = useLangGraphRuntime({
        stream: vi.fn(async function* () {}),
        load: load as never,
        unstable_threadListAdapter: adapter,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const Before = host("before");
    const After = host("after");
    const view = render(
      <Activity mode="visible">
        <Before />
      </Activity>,
    );
    await act(async () => {
      await runtime!.threads.switchToThread("thread-1");
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await refresh(Before, After);
    expect(rendered).toBe("after");
    expect(signal!.aborted).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);

    if (teardown === "hide") {
      await act(async () => {
        view.rerender(
          <Activity mode="hidden">
            <Before />
          </Activity>,
        );
      });
    } else {
      view.unmount();
    }
    await act(async () => {});
    expect(signal!.aborted).toBe(true);
  },
);
