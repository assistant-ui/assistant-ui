// @vitest-environment jsdom

import { act, useEffect } from "react";
import { STREAM_CONTROLLER } from "@langchain/react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useStreamRuntime } from "./useStreamRuntime";
import { useLangChainStream } from "./hooks";

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
  renderer!.setRefreshHandler(() => undefined);
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

it("replays hosted setup without executing a pending headless tool twice on Fast Refresh", async () => {
  const execute = vi.fn(() => new Promise<unknown>(() => {}));
  const tools = [{ tool: { name: "lookup" }, execute }];
  const interrupt = {
    id: "interrupt-one",
    value: {
      type: "tool",
      toolCall: { id: "call-one", name: "lookup", args: { query: "hello" } },
    },
  };
  const initialValues = { messages: [], __interrupt__: [interrupt] };
  const setup = vi.fn();
  let runtime!: ReturnType<typeof useStreamRuntime>;
  let stream: ReturnType<typeof useLangChainStream>;
  const Probe = () => {
    stream = useLangChainStream();
    return null;
  };
  let rendered = "";
  const host = (name: string) => () => {
    rendered = name;
    const adapter = useCloudThreadListAdapter({});
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useHostedStreamRuntime() {
        useEffect(() => {
          setup(name);
        }, []);
        return useStreamRuntime({
          apiUrl: "http://localhost:2024",
          assistantId: "agent",
          initialValues,
          tools,
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
      </AssistantRuntimeProvider>
    );
  };
  const Before = host("before");
  const After = host("after");
  const view = render(<Before />);
  await waitFor(() => expect(execute).toHaveBeenCalledOnce());
  expect(execute).toHaveBeenCalledWith({ query: "hello" });
  expect(setup).toHaveBeenLastCalledWith("before");
  view.rerender(<Before />);
  await act(async () => {});
  expect(setup).toHaveBeenCalledOnce();
  expect(execute).toHaveBeenCalledOnce();
  const originalRuntime = runtime;
  const controller = stream![STREAM_CONTROLLER];
  const threadId = runtime.threads.getState().mainThreadId;

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
  expect(runtime).toBe(originalRuntime);
  expect(runtime.threads.getState().mainThreadId).toBe(threadId);
  expect(stream!.values).toMatchObject({ __interrupt__: [interrupt] });
  expect(stream![STREAM_CONTROLLER]).toBe(controller);
  expect(execute).toHaveBeenCalledOnce();
  expect(setup).toHaveBeenCalledTimes(2);
  expect(setup).toHaveBeenLastCalledWith("after");
  view.unmount();
});
