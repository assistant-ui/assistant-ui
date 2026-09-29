// @vitest-environment jsdom

import { Activity, act } from "react";
import type { UIMessage } from "ai";
import type { SuggestionAdapter } from "@assistant-ui/core";
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
const { cleanup, render, waitFor } = await import("@testing-library/react");
const { useAISDKRuntime } = await import("./useAISDKRuntime");

afterEach(() => {
  cleanup();
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

it("aborts pending AI SDK suggestion generation when Activity hides", async () => {
  const chat = createChat();
  const { generate } = makeGeneration();
  const Host = () => {
    useAISDKRuntime(chat as never, { adapters: { suggestion: { generate } } });
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
});
