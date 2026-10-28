// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { AssistantCloud } from "assistant-cloud";
import { emptySessionView } from "eve/events";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { EveCloudSessions } from "./eveCloudSessions";
import { createEveDelivery, createEveDeliveryAfter } from "./testUtils";

const { mockUseEveAgent, directRuntimeHook, sessionInstances } = vi.hoisted(
  () => ({
    mockUseEveAgent: vi.fn(),
    directRuntimeHook: { current: false },
    sessionInstances: [] as unknown[],
  }),
);

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...original,
    useAui: () => {
      const aui = original.useAui();
      if (!directRuntimeHook.current) return aui;
      return new Proxy(aui, {
        get(target, key) {
          if (key !== "threadListItem") return Reflect.get(target, key);
          return new Proxy(target.threadListItem, {
            get(item, itemKey) {
              if (itemKey !== "getState") return Reflect.get(item, itemKey);
              return () => ({ ...item.getState(), status: "new" });
            },
          });
        },
      });
    },
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...original,
    useRemoteThreadListRuntime: (
      options: Parameters<typeof original.useRemoteThreadListRuntime>[0],
    ) =>
      directRuntimeHook.current
        ? options.runtimeHook()
        : original.useRemoteThreadListRuntime(options),
  };
});

vi.mock("./eveCloudSessions", async (importOriginal) => {
  const original = await importOriginal<typeof import("./eveCloudSessions")>();
  return {
    ...original,
    createEveCloudSessions: () => {
      const sessions = original.createEveCloudSessions();
      sessionInstances.push(sessions);
      return sessions;
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
const { AssistantRuntimeProvider } = await import("@assistant-ui/core/react");
const { useEveAgentRuntime } = await import("./useEveAgentRuntime");
const { useEveReset } = await import("./hooks");
const { useAui } = await import("@assistant-ui/store");

afterEach(() => {
  cleanup();
  mockUseEveAgent.mockReset();
  directRuntimeHook.current = false;
  sessionInstances.length = 0;
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

const makeAgent = (send: (content: string) => Promise<void>) => ({
  messages: [
    { id: "u1", role: "user", parts: [{ type: "text", text: "earlier" }] },
    {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "earlier answer" }],
    },
  ],
  view: emptySessionView(),
  error: undefined,
  events: [],
  session: undefined,
  status: "idle",
  send: vi.fn(async (content: string) => createEveDeliveryAfter(send(content))),
  respond: vi.fn(async () => createEveDelivery()),
  cancel: vi.fn(async () => createEveDelivery()),
  newSession: vi.fn(),
  resume: vi.fn(async () => {}),
});

it("dispatches an Eve send queued behind a turn after Fast Refresh", async () => {
  let releaseFirst!: () => void;
  const agent = makeAgent(
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined),
  );
  mockUseEveAgent.mockReturnValue(agent);
  let runtime!: ReturnType<typeof useEveAgentRuntime>;
  let rendered = "";
  const Before = () => {
    rendered = "before";
    runtime = useEveAgentRuntime();
    return null;
  };
  const After = () => {
    rendered = "after";
    runtime = useEveAgentRuntime();
    return null;
  };
  const view = render(<Before />);

  await act(async () => runtime.thread.append("first"));
  await waitFor(() => expect(agent.send).toHaveBeenCalledTimes(1));
  await act(async () => runtime.thread.append("queued"));
  expect(agent.send).toHaveBeenCalledTimes(1);

  await refresh(Before, After);
  expect(rendered).toBe("after");
  await act(async () => releaseFirst());
  await waitFor(() => expect(agent.send).toHaveBeenCalledTimes(2));
  expect(agent.send).toHaveBeenNthCalledWith(2, "queued", undefined);
  view.unmount();
});

it("abandons an Eve send still queued when the runtime unmounts", async () => {
  let releaseFirst!: () => void;
  const agent = makeAgent(
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined),
  );
  mockUseEveAgent.mockReturnValue(agent);
  let runtime!: ReturnType<typeof useEveAgentRuntime>;
  const Host = () => {
    runtime = useEveAgentRuntime();
    return null;
  };
  const view = render(<Host />);
  await act(async () => runtime.thread.append("first"));
  await waitFor(() => expect(agent.send).toHaveBeenCalledTimes(1));
  await act(async () => runtime.thread.append("queued"));

  view.unmount();
  await act(async () => {});
  await act(async () => releaseFirst());
  expect(agent.send).toHaveBeenCalledTimes(1);
});

const makeCloud = () => {
  const cloud = new AssistantCloud({
    baseUrl: "http://localhost",
    apiKey: "test-key",
    userId: "test-user",
    workspaceId: "test-workspace",
    telemetry: false,
  });
  let created = 0;
  vi.spyOn(cloud.threads, "list").mockResolvedValue({ threads: [] });
  const create = vi
    .spyOn(cloud.threads, "create")
    .mockImplementation(async () => ({
      thread_id: `cloud-${++created}`,
    }));
  vi.spyOn(cloud.threads, "update").mockResolvedValue(undefined);
  vi.spyOn(cloud.threads, "delete").mockResolvedValue(undefined);
  vi.spyOn(cloud.threads.messages, "list").mockResolvedValue({ messages: [] });
  vi.spyOn(cloud.threads.messages, "create").mockResolvedValue({
    message_id: "cloud-message",
  });
  vi.spyOn(cloud.events, "track").mockImplementation(() => {});
  vi.spyOn(cloud.runs, "report").mockResolvedValue({ run_id: "test-run" });
  vi.spyOn(cloud, "registerSdk").mockImplementation(() => {});
  return { cloud, create };
};

it("resolves a pending first Eve session after Fast Refresh", async () => {
  const { cloud, create } = makeCloud();
  let onSessionChange:
    | ((session: { sessionId: string; streamIndex: number }) => void)
    | undefined;
  const agent = makeAgent(async () => {});
  agent.messages = [];
  mockUseEveAgent.mockImplementation((options) => {
    onSessionChange = options.onSessionChange;
    return agent;
  });
  let runtime!: ReturnType<typeof useEveAgentRuntime>;
  let rendered = "";
  const Probe = () => {
    useEveReset();
    return null;
  };
  const Before = () => {
    rendered = "before";
    runtime = useEveAgentRuntime({ cloud });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
      </AssistantRuntimeProvider>
    );
  };
  const After = () => {
    rendered = "after";
    runtime = useEveAgentRuntime({ cloud });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<Before />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => runtime.thread.append("first"));
  await waitFor(() => expect(agent.send).toHaveBeenCalledTimes(1));
  expect(create).not.toHaveBeenCalled();

  await refresh(Before, After);
  expect(rendered).toBe("after");
  expect(create).not.toHaveBeenCalled();
  act(() => onSessionChange?.({ sessionId: "session-1", streamIndex: 0 }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith({
      last_message_at: expect.any(Date),
      external_id: "session-1",
      upsert: true,
    }),
  );
  view.unmount();
});

it("keeps a first Eve session wait alive when a nested runtimeHook refreshes", async () => {
  directRuntimeHook.current = true;
  const { cloud } = makeCloud();
  const agent = makeAgent(async () => {});
  let onSessionChange:
    | ((session: { sessionId: string; streamIndex: number }) => void)
    | undefined;
  mockUseEveAgent.mockImplementation((options) => {
    onSessionChange = options.onSessionChange;
    return agent;
  });
  let threadId = "";
  let rendered = "";
  const Before = () => {
    rendered = "before";
    threadId = useAui().threadListItem.getState().id;
    useEveAgentRuntime({ cloud });
    return null;
  };
  const After = () => {
    rendered = "after";
    threadId = useAui().threadListItem.getState().id;
    useEveAgentRuntime({ cloud });
    return null;
  };
  const Host = ({ children }: { children: ReactNode }) => {
    const runtime = useEveAgentRuntime();
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
  };
  const view = render(
    <Host>
      <Before />
    </Host>,
  );
  const sessions = sessionInstances[0] as EveCloudSessions;
  const waiting = sessions.wait(threadId);

  await refresh(Before, After);
  expect(rendered).toBe("after");
  act(() => onSessionChange?.({ sessionId: "session-1", streamIndex: 0 }));
  await expect(waiting).resolves.toBe("session-1");
  view.unmount();
});
