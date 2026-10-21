// @vitest-environment jsdom

import { Activity, act, version } from "react";
import type { UIMessage } from "ai";
import type { SuggestionAdapter } from "@assistant-ui/core";
import { afterAll, afterEach, expect, it, vi } from "vitest";

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
const { useAISDKRuntime } = await import("./useAISDKRuntime");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  renderer!.setRefreshHandler(() => undefined);
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

const createChat = () => ({
  id: "chat-1",
  status: "submitted",
  error: null,
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
  ] as UIMessage[],
  setMessages: vi.fn(),
  sendMessage: vi.fn(async () => {}),
  regenerate: vi.fn(async () => {}),
  addToolResult: vi.fn(),
  addToolOutput: vi.fn(),
  stop: vi.fn(),
});

const settleChat = (chat: ReturnType<typeof createChat>) => {
  chat.status = "ready";
  chat.messages = [
    ...chat.messages,
    { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
  ];
};

const makeGeneration = () => {
  let resolve!: (value: readonly { prompt: string }[]) => void;
  const generate = vi.fn(
    (_input: Parameters<SuggestionAdapter["generate"]>[0]) =>
      new Promise<readonly { prompt: string }[]>((done) => {
        resolve = done;
      }),
  );
  return {
    generate,
    finish: (value: readonly { prompt: string }[]) => resolve(value),
  };
};

it("keeps a message createdAt across Fast Refresh", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  const chat = createChat();
  let runtime!: ReturnType<typeof useAISDKRuntime>;
  let rendered = "";
  const Before = () => {
    rendered = "before";
    runtime = useAISDKRuntime(chat as never);
    return null;
  };
  const After = () => {
    rendered = "after";
    runtime = useAISDKRuntime(chat as never);
    return null;
  };
  const view = render(<Before />);
  const createdAt = runtime.thread.getState().messages[0]!.createdAt.getTime();

  vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
  await refresh(Before, After);

  expect(rendered).toBe("after");
  expect(runtime.thread.getState().messages[0]!.createdAt.getTime()).toBe(
    createdAt,
  );
  view.unmount();
});

it("keeps earlier createdAt values when streaming timing changes", async () => {
  vi.useFakeTimers();
  const firstSeen = new Date("2026-01-01T00:00:00.000Z");
  const laterSeen = new Date("2026-01-01T00:01:00.000Z");
  vi.setSystemTime(firstSeen);
  const chat = createChat();
  chat.status = "ready";
  let runtime!: ReturnType<typeof useAISDKRuntime>;
  const Host = () => {
    runtime = useAISDKRuntime(chat as never);
    return null;
  };
  const view = render(<Host />);
  const firstCreatedAt = runtime.thread
    .getState()
    .messages[0]!.createdAt.getTime();

  vi.setSystemTime(laterSeen);
  chat.status = "streaming";
  chat.messages = [
    ...chat.messages,
    { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
  ];
  view.rerender(<Host />);
  const laterCreatedAt = runtime.thread
    .getState()
    .messages[1]!.createdAt.getTime();

  vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
  chat.status = "ready";
  view.rerender(<Host />);

  expect(firstCreatedAt).toBe(firstSeen.getTime());
  expect(laterCreatedAt).toBe(laterSeen.getTime());
  expect(runtime.thread.getState().messages[1]!.metadata.timing).toBeDefined();
  expect(runtime.thread.getState().messages[0]!.createdAt.getTime()).toBe(
    firstCreatedAt,
  );
  expect(runtime.thread.getState().messages[1]!.createdAt.getTime()).toBe(
    laterCreatedAt,
  );
  view.unmount();
});

it("completes AI SDK suggestion generation after Fast Refresh", async () => {
  const chat = createChat();
  const { generate, finish } = makeGeneration();
  let runtime!: ReturnType<typeof useAISDKRuntime>;
  let rendered = "";
  const Before = () => {
    rendered = "before";
    runtime = useAISDKRuntime(chat as never, {
      adapters: { suggestion: { generate } },
    });
    return null;
  };
  const After = () => {
    rendered = "after";
    runtime = useAISDKRuntime(chat as never, {
      adapters: { suggestion: { generate } },
    });
    return null;
  };
  const view = render(<Before />);
  settleChat(chat);
  view.rerender(<Before />);
  await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
  const signal = generate.mock.calls[0]![0].signal!;

  await refresh(Before, After);
  expect(rendered).toBe("after");
  expect(signal.aborted).toBe(false);
  await act(async () => finish([{ prompt: "next" }]));
  await waitFor(() =>
    expect(runtime.thread.getState().suggestions).toEqual([{ prompt: "next" }]),
  );
  view.unmount();
});

it("aborts pending AI SDK suggestion generation on unmount", async () => {
  const chat = createChat();
  const { generate } = makeGeneration();
  const Host = () => {
    useAISDKRuntime(chat as never, { adapters: { suggestion: { generate } } });
    return null;
  };
  const view = render(<Host />);
  settleChat(chat);
  view.rerender(<Host />);
  await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
  const signal = generate.mock.calls[0]![0].signal!;

  view.unmount();
  await act(async () => {});
  expect(signal.aborted).toBe(true);
});

// Activity is React 19 only.
it.skipIf(onReact18)(
  "aborts pending AI SDK suggestion generation when Activity hides",
  async () => {
    const chat = createChat();
    const { generate } = makeGeneration();
    const Host = () => {
      useAISDKRuntime(chat as never, {
        adapters: { suggestion: { generate } },
      });
      return null;
    };
    const view = render(
      <Activity mode="visible">
        <Host />
      </Activity>,
    );
    settleChat(chat);
    view.rerender(
      <Activity mode="visible">
        <Host />
      </Activity>,
    );
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    const signal = generate.mock.calls[0]![0].signal!;

    view.rerender(
      <Activity mode="hidden">
        <Host />
      </Activity>,
    );
    await act(async () => {});
    expect(signal.aborted).toBe(true);
  },
);
