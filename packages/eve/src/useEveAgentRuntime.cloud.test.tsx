// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import type { AssistantCloud } from "assistant-cloud";
import type { ClientSessionState } from "eve/client";
import type { EveMessageData, UseEveAgentOptions } from "eve/react";
import { Component, StrictMode, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

const { mockUseEveAgent } = vi.hoisted(() => ({
  mockUseEveAgent: vi.fn(),
}));

vi.mock("eve/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/react")>()),
  useEveAgent: mockUseEveAgent,
}));

import { useEveReset } from "./hooks";
import {
  useEveAgentRuntime,
  type UseEveAgentRuntimeOptions,
} from "./useEveAgentRuntime";

type AgentOptions = UseEveAgentOptions<EveMessageData>;

type FakeSnapshot = { data: EveMessageData; status: string };

type FakeAgent = {
  readonly initialOptions: AgentOptions;
  options: AgentOptions;
  update: (next: Partial<FakeSnapshot>) => void;
  readonly send: Mock<() => Promise<void>>;
  readonly reset: Mock<() => void>;
  readonly resume: Mock<() => Promise<void>>;
};

const agents: FakeAgent[] = [];
let withResume = true;

const createdSession = (sessionId: string): ClientSessionState => ({
  sessionId,
  streamIndex: 5,
});

mockUseEveAgent.mockImplementation(function useFakeEveAgent(
  options: AgentOptions,
) {
  const [agent] = useState(() => {
    const created: FakeAgent = {
      initialOptions: options,
      options,
      update: () => {},
      send: vi.fn(async () => {}),
      reset: vi.fn(),
      resume: vi.fn(async () => {}),
    };
    agents.push(created);
    return created;
  });
  const [snapshot, setSnapshot] = useState<FakeSnapshot>({
    data: { messages: [] },
    status: "ready",
  });
  agent.options = options;
  agent.update = (next) => setSnapshot((current) => ({ ...current, ...next }));
  return {
    data: snapshot.data,
    error: undefined,
    events: [],
    session: agent.initialOptions.initialSession,
    status: snapshot.status,
    send: agent.send,
    respond: vi.fn(async () => {}),
    cancel: vi.fn(async () => ({ status: "no_active_turn" })),
    reset: agent.reset,
    ...(withResume ? { resume: agent.resume } : {}),
  };
});

type CloudThreadRow = { id: string; external_id: string | null };

const makeCloud = (
  rows: CloudThreadRow[] = [],
  telemetry: { enabled: boolean } = { enabled: false },
) => {
  let created = 0;
  return {
    threads: {
      list: vi.fn(async ({ is_archived }: { is_archived?: boolean } = {}) => ({
        threads: is_archived
          ? []
          : rows.map((row) => ({
              ...row,
              title: row.id,
              is_archived: false,
              last_message_at: new Date(0),
              metadata: null,
            })),
      })),
      create: vi.fn(async () => ({ thread_id: `cloud-${++created}` })),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      get: vi.fn(),
      messages: {
        list: vi.fn(async () => ({ messages: [] })),
        create: vi.fn(async () => ({ message_id: "cloud-message" })),
        update: vi.fn(async () => {}),
      },
    },
    events: { track: vi.fn() },
    telemetry,
    runs: {
      report: vi.fn(async () => {}),
      stream: vi.fn(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
      ),
    },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud & {
    threads: { create: Mock; list: Mock; messages: { create: Mock } };
    registerSdk: Mock;
  };
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const setup = (
  options: UseEveAgentRuntimeOptions,
  { strict = false }: { strict?: boolean } = {},
) => {
  let runtime!: AssistantRuntime;
  let reset!: () => void;
  const ResetProbe = () => {
    reset = useEveReset();
    return null;
  };
  const App = () => {
    runtime = useEveAgentRuntime(options);
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ResetProbe />
      </AssistantRuntimeProvider>
    );
  };
  render(
    strict ? (
      <StrictMode>
        <App />
      </StrictMode>
    ) : (
      <App />
    ),
  );
  return { runtime: () => runtime, reset: () => reset() };
};

const lastAgent = () => {
  const agent = agents.at(-1);
  if (!agent) throw new Error("no eve agent mounted");
  return agent;
};

afterEach(() => {
  agents.length = 0;
  withResume = true;
});

describe("useEveAgentRuntime with cloud", () => {
  it("saves a new thread once its first turn creates a session, with that session as its external id", async () => {
    const cloud = makeCloud();
    const app = setup({
      cloud,
      initialSession: { sessionId: "ignored", streamIndex: 1 },
      resume: true,
    });
    await settle();

    const agent = lastAgent();
    expect(agent.initialOptions.initialSession).toBeUndefined();
    expect(agent.initialOptions.resume).toBeUndefined();
    expect(cloud.registerSdk).toHaveBeenCalledWith({
      name: "@assistant-ui/eve",
      version: expect.any(String),
    });

    let acceptTurn!: () => void;
    agent.send.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          acceptTurn = () => {
            agent.options.onSessionChange?.(createdSession("session-1"));
            resolve();
          };
        }),
    );
    act(() => app.runtime().thread.append("hi"));
    await settle();

    expect(agent.send).toHaveBeenCalledOnce();
    expect(cloud.threads.create).not.toHaveBeenCalled();

    await act(async () => acceptTurn());
    await waitFor(() =>
      expect(cloud.threads.create).toHaveBeenCalledExactlyOnceWith({
        last_message_at: expect.any(Date),
        external_id: "session-1",
      }),
    );
    await waitFor(() =>
      expect(app.runtime().threads.mainItem.getState()).toMatchObject({
        status: "regular",
        remoteId: "cloud-1",
        externalId: "session-1",
      }),
    );
  });

  it("leaves a thread unsaved when its first turn ends without a session, then saves it with the next turn's", async () => {
    const cloud = makeCloud();
    const app = setup({ cloud });
    await settle();
    const agent = lastAgent();

    agent.send.mockImplementationOnce(async () => {
      agent.options.onSessionChange?.(undefined);
    });
    act(() => app.runtime().thread.append("hi"));
    await settle();

    expect(cloud.threads.create).not.toHaveBeenCalled();
    expect(app.runtime().threads.mainItem.getState().status).toBe("new");

    agent.send.mockImplementationOnce(async () => {
      agent.options.onSessionChange?.(createdSession("session-2"));
    });
    act(() => app.runtime().thread.append("again"));

    await waitFor(() =>
      expect(cloud.threads.create).toHaveBeenCalledExactlyOnceWith({
        last_message_at: expect.any(Date),
        external_id: "session-2",
      }),
    );
  });

  it("releases a new thread whose first message is staged, and saves it once a run creates the session", async () => {
    const cloud = makeCloud();
    const app = setup({ cloud });
    await settle();
    const agent = lastAgent();

    act(() =>
      app.runtime().thread.append({
        role: "user",
        content: [{ type: "text", text: "draft" }],
        startRun: false,
      }),
    );
    await settle();

    expect(agent.send).not.toHaveBeenCalled();
    expect(cloud.threads.create).not.toHaveBeenCalled();
    expect(app.runtime().threads.mainItem.getState().status).toBe("new");
    const switched = await act(() =>
      Promise.race([
        app
          .runtime()
          .threads.switchToNewThread()
          .then(() => "switched"),
        new Promise((resolve) => setTimeout(resolve, 1000, "stuck")),
      ]),
    );
    expect(switched).toBe("switched");

    const staged = app.runtime().thread.getState().messages.at(-1);
    if (!staged) throw new Error("the staged message is missing");
    agent.send.mockImplementationOnce(async () => {
      agent.options.onSessionChange?.(createdSession("session-3"));
    });
    await act(() => app.runtime().thread.startRun({ parentId: staged.id }));

    await waitFor(() =>
      expect(cloud.threads.create).toHaveBeenCalledExactlyOnceWith({
        last_message_at: expect.any(Date),
        external_id: "session-3",
      }),
    );
  });

  it("opens a listed thread on the session its external id names and replays it", async () => {
    const cloud = makeCloud([{ id: "cloud-9", external_id: "session-9" }]);
    const app = setup({ cloud });
    await waitFor(() =>
      expect(app.runtime().threads.getState().threadIds).toContain("cloud-9"),
    );

    await act(() => app.runtime().threads.switchToThread("cloud-9"));
    await settle();

    const agent = lastAgent();
    expect(agent.initialOptions).toMatchObject({
      initialSession: { sessionId: "session-9", streamIndex: 0 },
      resume: true,
    });
    expect(agent.resume).toHaveBeenCalledOnce();
  });

  it("replays a listed thread once under StrictMode", async () => {
    const cloud = makeCloud([{ id: "cloud-9", external_id: "session-9" }]);
    const app = setup({ cloud }, { strict: true });
    await waitFor(() =>
      expect(app.runtime().threads.getState().threadIds).toContain("cloud-9"),
    );

    await act(() => app.runtime().threads.switchToThread("cloud-9"));
    await settle();

    const replays = agents
      .filter((agent) => agent.initialOptions.initialSession !== undefined)
      .reduce((count, agent) => count + agent.resume.mock.calls.length, 0);
    expect(replays).toBe(1);
  });

  it("refuses to send in a listed thread that has no eve session and hands the draft back", async () => {
    const cloud = makeCloud([{ id: "cloud-7", external_id: null }]);
    const app = setup({ cloud });
    await waitFor(() =>
      expect(app.runtime().threads.getState().threadIds).toContain("cloud-7"),
    );
    await act(() => app.runtime().threads.switchToThread("cloud-7"));
    await settle();

    const composer = app.runtime().thread.composer;
    act(() => {
      composer.setText("hello");
      composer.send();
    });
    await settle();

    expect(lastAgent().send).not.toHaveBeenCalled();
    expect(composer.getState().text).toBe("hello");
  });

  it("starts a new thread on reset and keeps the current one with its session", async () => {
    const cloud = makeCloud();
    const app = setup({ cloud });
    await settle();
    const agent = lastAgent();
    agent.send.mockImplementationOnce(async () => {
      agent.options.onSessionChange?.(createdSession("session-1"));
    });
    act(() => app.runtime().thread.append("hi"));
    await waitFor(() =>
      expect(app.runtime().threads.mainItem.getState().remoteId).toBe(
        "cloud-1",
      ),
    );
    const savedId = app.runtime().threads.mainItem.getState().id;

    act(() => app.reset());
    await settle();

    expect(agent.reset).not.toHaveBeenCalled();
    expect(app.runtime().threads.mainItem.getState()).toMatchObject({
      status: "new",
    });
    expect(app.runtime().threads.mainItem.getState().id).not.toBe(savedId);
    expect(app.runtime().threads.getItemById(savedId).getState()).toMatchObject(
      { remoteId: "cloud-1", externalId: "session-1" },
    );
  });

  it("copies each settled turn into the cloud thread under eve's message ids", async () => {
    const cloud = makeCloud([], { enabled: true });
    const app = setup({ cloud });
    await settle();
    const agent = lastAgent();
    agent.send.mockImplementationOnce(async () => {
      agent.options.onSessionChange?.(createdSession("session-1"));
    });
    act(() => app.runtime().thread.append("hi"));
    await waitFor(() => expect(cloud.threads.create).toHaveBeenCalledOnce());

    act(() => agent.update({ status: "streaming" }));
    act(() =>
      agent.update({
        status: "ready",
        data: {
          messages: [
            {
              id: "turn_1:user",
              role: "user",
              parts: [{ type: "text", text: "hi" }],
              metadata: { turnId: "turn_1" },
            },
            {
              id: "turn_1:assistant",
              role: "assistant",
              parts: [{ type: "text", text: "hello" }],
              metadata: { turnId: "turn_1" },
            },
          ],
        } as never,
      }),
    );
    await settle();

    await waitFor(() =>
      expect(cloud.threads.messages.create).toHaveBeenCalledTimes(2),
    );
    expect(cloud.threads.messages.create.mock.calls).toMatchObject([
      ["cloud-1", { format: "aui/v0", external_id: "turn_1:user" }],
      [
        "cloud-1",
        {
          format: "aui/v0",
          external_id: "turn_1:assistant",
          parent_external_id: "turn_1:user",
        },
      ],
    ]);
  });

  it("requires an eve that can resume a session", async () => {
    withResume = false;
    const errors: unknown[] = [];
    class Boundary extends Component<{ children: ReactNode }> {
      override state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      override componentDidCatch(error: unknown) {
        errors.push(error);
      }
      override render() {
        return this.state.failed ? null : this.props.children;
      }
    }
    const cloud = makeCloud();
    const App = () => {
      const runtime = useEveAgentRuntime({ cloud });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <Boundary>
        <App />
      </Boundary>,
    );
    await settle();

    expect(errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("eve 0.44.1 or later"),
      }),
    );
    consoleError.mockRestore();
  });
});

describe("useEveAgentRuntime switching cloud after mount", () => {
  it.each([
    ["adding", {}, { cloud: makeCloud() }],
    ["removing", { cloud: makeCloud() }, {}],
  ] as const)(
    "names the remount when %s cloud",
    (
      _,
      initialProps: UseEveAgentRuntimeOptions,
      nextProps: UseEveAgentRuntimeOptions,
    ) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { rerender } = renderHook(
        (props: UseEveAgentRuntimeOptions) => useEveAgentRuntime(props),
        { initialProps },
      );

      expect(() => rerender(nextProps)).toThrow(
        "useEveAgentRuntime cannot add or remove `cloud` after it mounts",
      );
      consoleError.mockRestore();
    },
  );
});

describe("useEveAgentRuntime without cloud", () => {
  it("keeps the caller's session options and replays only when asked to", async () => {
    const initialSession = { sessionId: "session-1", streamIndex: 4 };
    setup({ initialSession });
    await settle();

    expect(lastAgent().initialOptions).toMatchObject({ initialSession });
    expect(lastAgent().resume).not.toHaveBeenCalled();
  });
});
