// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

// Fast Refresh drives React through the renderer internals handed to the DevTools hook, so the hook has to exist before react-dom loads.
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
const { AssistantRuntimeProvider } = await import("@assistant-ui/core/react");
const { useChatRuntime } = await import("./useChatRuntime");
const { createCancellableTransport, createStreamHarness } =
  await import("./__tests__/controlled-transport");

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

it("keeps a running thread across a Fast Refresh of its host and aborts it on unmount", async () => {
  const { transport, getCancelCount } = createCancellableTransport();
  const { Probe, send, isRunning, client } = createStreamHarness();
  const runtimes: unknown[] = [];
  let rendered: string | undefined;
  const createHost =
    (name: string) =>
    ({ children }: { children: ReactNode }) => {
      rendered = name;
      const runtime = useChatRuntime({ transport });
      runtimes.push(runtime);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      );
    };
  const Before = createHost("before");
  const After = createHost("after");

  const view = render(
    <Before>
      <Probe />
    </Before>,
  );
  await act(async () => send());
  await waitFor(() => expect(isRunning()).toBe(true));
  const runtime = runtimes.at(-1);
  const threadId = client().threads.getState().mainThreadId;
  const messages = client().thread.getState().messages;
  const error = vi.spyOn(console, "error");

  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const fiberRoot of fiberRoots) {
      renderer!.scheduleRefresh(fiberRoot, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});

  expect(rendered).toBe("after");
  expect(runtimes.at(-1)).toBe(runtime);
  expect(isRunning()).toBe(true);
  expect(getCancelCount()).toBe(0);
  expect(client().threads.getState().mainThreadId).toBe(threadId);
  expect(client().thread.getState().messages).toEqual(messages);
  expect(error).not.toHaveBeenCalled();

  view.unmount();
  await waitFor(() => expect(getCancelCount()).toBe(1));
});
