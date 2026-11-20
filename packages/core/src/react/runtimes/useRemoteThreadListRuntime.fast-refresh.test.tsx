// @vitest-environment jsdom

import { act, useCallback, useRef, useState } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type {
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../../runtime/utils/chat-model-adapter";
import { useLocalRuntime } from "./useLocalRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";

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
const { deferred, makeAdapter } =
  await import("../../tests/remote-thread-list-test-helpers");

afterEach(() => {
  cleanup();
  renderer!.setRefreshHandler(() => undefined);
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

const createHarness = () => {
  const adapter = makeAdapter();
  const sendTo = vi.fn(
    async (
      _path: string,
      _input: ChatModelRunOptions,
    ): Promise<ChatModelRunResult> => ({
      content: [{ type: "text", text: "reply" }],
    }),
  );
  let runtime!: AssistantRuntime;
  let localRuntime!: AssistantRuntime;
  let state!: { count: number; increment: () => void; ref: object };
  let rendered = "";
  const host = (path: string) => () => {
    rendered = path;
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useHostedLocalRuntime() {
        const [count, setCount] = useState(0);
        const ref = useRef({});
        state = {
          count,
          increment: () => setCount((n) => n + 1),
          ref: ref.current,
        };
        const run = useCallback(
          (input: ChatModelRunOptions) => sendTo(path, input),
          [],
        );
        localRuntime = useLocalRuntime({ run });
        return localRuntime;
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  const Before = host("/old");
  const After = host("/new");
  render(<Before />);
  const refresh = async () => {
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
    expect(rendered).toBe("/new");
  };
  const send = async () => {
    await act(async () => {
      void runtime.thread.append("hello");
    });
  };
  return {
    sendTo,
    refresh,
    send,
    runtime: () => runtime,
    localRuntime: () => localRuntime,
    state: () => state,
  };
};

it("uses an edited hosted callback after Fast Refresh", async () => {
  const h = createHarness();
  await h.send();
  await waitFor(() =>
    expect(h.runtime().thread.getState().isRunning).toBe(false),
  );
  expect(h.sendTo).toHaveBeenLastCalledWith("/old", expect.anything());

  await h.refresh();
  await h.send();

  await waitFor(() => expect(h.sendTo).toHaveBeenCalledTimes(2));
  expect(h.sendTo).toHaveBeenLastCalledWith("/new", expect.anything());
});

it("preserves hosted state, refs and an in-flight local run while refreshing its callback", async () => {
  const h = createHarness();
  const pending = deferred<ChatModelRunResult>();
  h.sendTo.mockReturnValueOnce(pending.promise);
  await act(async () => h.state().increment());
  await h.send();
  await waitFor(() => expect(h.sendTo).toHaveBeenCalledOnce());
  const signal = h.sendTo.mock.calls[0]![1].abortSignal;
  const runtime = h.runtime();
  const localRuntime = h.localRuntime();
  const ref = h.state().ref;
  const threadId = runtime.threads.getState().mainThreadId;
  const messages = runtime.thread.getState().messages;
  act(() => runtime.thread.composer.setText("draft"));

  await h.refresh();

  expect(h.runtime()).toBe(runtime);
  expect(h.localRuntime()).toBe(localRuntime);
  expect(h.state().count).toBe(1);
  expect(h.state().ref).toBe(ref);
  expect(runtime.threads.getState().mainThreadId).toBe(threadId);
  expect(runtime.thread.getState().messages).toEqual(messages);
  expect(runtime.thread.composer.getState().text).toBe("draft");
  expect(runtime.thread.getState().isRunning).toBe(true);
  expect(signal.aborted).toBe(false);
  expect(h.sendTo).toHaveBeenCalledOnce();

  await act(async () =>
    pending.resolve({ content: [{ type: "text", text: "finished" }] }),
  );
  await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(false));
  expect(runtime.thread.getState().messages.at(-1)?.content).toEqual([
    { type: "text", text: "finished" },
  ]);
  await h.send();
  await waitFor(() => expect(h.sendTo).toHaveBeenCalledTimes(2));
  expect(h.sendTo).toHaveBeenLastCalledWith("/new", expect.anything());
});
