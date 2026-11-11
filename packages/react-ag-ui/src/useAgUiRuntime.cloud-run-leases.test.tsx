// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { HttpAgent, type RunAgentInput } from "@ag-ui/client";
import {
  AssistantRuntimeProvider,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useThreadReplyState,
} from "@assistant-ui/core/react";
import { useThreadResume } from "@assistant-ui/core/react/internal";
import type { AssistantRuntime } from "@assistant-ui/core";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { AssistantCloud } from "assistant-cloud";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

// Smoke test of AG-UI on the real AssistantCloud client; the run lease rules are covered in core's runLeases.test.tsx.
type Row = {
  id: string;
  parent_id: string | null;
  format: string;
  content: unknown;
  external_id: string | null;
};

type Call = { method: string; path: string; body: any };

const createServer = (rows: Row[], run: unknown = null) => {
  const calls: Call[] = [];
  let created = 0;
  const at = new Date(0).toISOString();
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "content-type": "application/json" },
    });
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const path = url.pathname.replace(/^\/v1/, "");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path, body });
      if (method === "GET" && path === "/threads")
        return json({
          threads: rows.length
            ? [
                {
                  id: "remote-1",
                  title: "t",
                  is_archived: false,
                  external_id: null,
                  metadata: null,
                  project_id: "p",
                  workspace_id: "w",
                  created_at: at,
                  updated_at: at,
                  last_message_at: at,
                },
              ]
            : [],
        });
      if (method === "POST" && path === "/threads")
        return json({ thread_id: "remote-1" });
      if (method === "GET" && path === "/threads/remote-1/messages")
        return json({
          messages: [...rows].reverse().map((row, height) => ({
            ...row,
            height,
            created_at: at,
            updated_at: at,
          })),
          run,
        });
      if (method === "POST" && path === "/threads/remote-1/runs")
        return json({ lease_id: "lease_1", heartbeat_interval_ms: 20_000 });
      if (method === "POST" && path === "/threads/remote-1/messages") {
        const id = `msg_${++created}`;
        rows.push({
          id,
          parent_id: body.parent_id,
          format: body.format,
          content: body.content,
          external_id: body.external_id ?? null,
        });
        return json({ message_id: id }, 201);
      }
      return json({});
    },
  );
  return { rows, calls, fetchMock };
};

const replyCreates = (calls: Call[]) =>
  calls.filter(
    (c) =>
      c.method === "POST" &&
      c.path === "/threads/remote-1/messages" &&
      c.body.content.role === "assistant",
  );

type Subscriber = Record<
  string,
  ((payload: { event: any }) => void) | undefined
>;

// An AG-UI agent whose runs are scripted: it streams one text message, under an id the backend picks, and finishes when the test says so.
class ScriptedAgent extends HttpAgent {
  runs: { finish: () => void; input: RunAgentInput }[] = [];
  constructor() {
    super({ url: "http://agent.test" });
  }
  override async runAgent(
    parameters?: Partial<RunAgentInput>,
    subscriber?: Subscriber,
  ): Promise<any> {
    const input = parameters as RunAgentInput;
    const id = `agent-msg-${this.runs.length + 1}`;
    const emit = (name: string, event: object) =>
      subscriber?.[name]?.({ event });
    emit("onRunStartedEvent", {
      type: "RUN_STARTED",
      threadId: input.threadId,
      runId: input.runId,
    });
    emit("onTextMessageStartEvent", {
      type: "TEXT_MESSAGE_START",
      messageId: id,
      role: "assistant",
    });
    emit("onTextMessageContentEvent", {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: id,
      delta: "partial",
    });
    await new Promise<void>((resolve) =>
      this.runs.push({ finish: resolve, input }),
    );
    emit("onTextMessageContentEvent", {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: id,
      delta: " answer",
    });
    emit("onTextMessageEndEvent", { type: "TEXT_MESSAGE_END", messageId: id });
    emit("onRunFinishedEvent", {
      type: "RUN_FINISHED",
      threadId: input.threadId,
      runId: input.runId,
    });
    return { result: undefined, newMessages: [] };
  }
  override abortRun() {}
}

const renderApp = async (
  server: ReturnType<typeof createServer>,
  staleAfter?: number,
) => {
  const cloud = new AssistantCloud({
    baseUrl: "http://cloud.test",
    apiKey: "key",
    userId: "user",
    workspaceId: "workspace",
    telemetry: false,
  });
  const agent = new ScriptedAgent();
  let aui!: AssistantClient;
  let runtime!: AssistantRuntime;
  const hooks: {
    replyState?: ReturnType<typeof useThreadReplyState>;
    resume?: ReturnType<typeof useThreadResume>;
  } = {};
  const Capture = () => {
    aui = useAui();
    hooks.replyState = useThreadReplyState();
    hooks.resume = useThreadResume();
    return null;
  };
  const App = () => {
    const adapter = useCloudThreadListAdapter({
      cloud,
      ...(staleAfter !== undefined ? { staleAfter } : undefined),
    });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function RuntimeHook() {
        return useAgUiRuntime({ agent });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  // Each app reaches the server through its own fetch, so two apps act as two tabs.
  vi.stubGlobal("fetch", server.fetchMock);
  const view = render(<App />);
  await act(async () => {
    await aui.threads.getLoadThreadsPromise();
  });
  return {
    agent,
    hooks,
    unmount: view.unmount,
    getAui: () => aui,
    getRuntime: () => runtime,
  };
};

const userRow: Row = {
  id: "u1",
  parent_id: null,
  format: "aui/v0",
  content: { role: "user", content: [{ type: "text", text: "hello" }] },
  external_id: "u1",
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAgUiRuntime with Assistant Cloud run leases", () => {
  it("opens the thread's lease when the run starts and stores the reply under the agent's id when it finishes", async () => {
    const server = createServer([]);
    const { agent, getAui } = await renderApp(server);
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(agent.runs).toHaveLength(1));
    await waitFor(() =>
      expect(
        server.calls.some((c) => c.path === "/threads/remote-1/runs"),
      ).toBe(true),
    );
    expect(replyCreates(server.calls)).toHaveLength(0);

    await act(async () => {
      agent.runs[0]!.finish();
    });
    await waitFor(() =>
      expect(
        server.calls.some((c) => c.path.endsWith("/runs/lease_1/end")),
      ).toBe(true),
    );
    const [reply] = replyCreates(server.calls);
    expect(reply!.body).toMatchObject({
      parent_id: "msg_1",
      external_id: "agent-msg-1",
      lease_id: "lease_1",
    });
    expect(replyCreates(server.calls)).toHaveLength(1);
  });

  it("resumes an interrupted thread from the user's message without a branch", async () => {
    const server = createServer([userRow], {
      status: "running",
      message_id: null,
      parent_id: "u1",
      last_heartbeat_ms_ago: 45_000,
    });
    const app = await renderApp(server);
    await act(async () => {
      await app.getRuntime().threads.switchToThread("remote-1");
    });
    await waitFor(() => expect(app.hooks.replyState).toBe("interrupted"));
    await waitFor(() => expect(app.hooks.resume?.disabled).toBe(false));

    await act(async () => {
      app.hooks.resume!.resume();
    });
    await waitFor(() => expect(app.agent.runs).toHaveLength(1));
    await act(async () => {
      app.agent.runs[0]!.finish();
    });
    await waitFor(() => expect(replyCreates(server.calls)).toHaveLength(1));
    expect(replyCreates(server.calls)[0]!.body).toMatchObject({
      parent_id: "u1",
      lease_id: "lease_1",
    });
    expect(
      app.getAui().thread.message({ index: 1 }).getState().branchCount,
    ).toBe(1);
  });
});
