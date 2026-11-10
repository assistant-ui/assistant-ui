// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { HttpAgent, type RunAgentInput } from "@ag-ui/client";
import {
  AssistantRuntimeProvider,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { AssistantCloud } from "assistant-cloud";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

// The real AssistantCloud client runs against this in-memory server.
type Row = {
  id: string;
  parent_id: string | null;
  format: string;
  content: unknown;
  external_id: string | null;
  run?: { status: "running" | "ended"; last_heartbeat_ms_ago: number };
};

type Call = { method: string; path: string; body: any };

const createServer = (
  initialRows: Row[] = [],
  heartbeatIntervalMs = 20_000,
) => {
  const rows = [...initialRows];
  const calls: Call[] = [];
  let created = 0;
  let leases = 0;
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
      if (method === "GET" && path === "/threads") {
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
      }
      if (method === "POST" && path === "/threads")
        return json({ thread_id: "remote-1" });
      if (method === "GET" && path === "/threads/remote-1/messages") {
        return json({
          messages: [...rows].reverse().map((row, height) => ({
            ...row,
            height,
            created_at: at,
            updated_at: at,
            run: row.run ?? null,
          })),
        });
      }
      if (method === "POST" && path === "/threads/remote-1/messages") {
        const id = `msg_${++created}`;
        rows.push({
          id,
          parent_id: body.parent_id,
          format: body.format,
          content: body.content,
          external_id: body.external_id ?? null,
          ...(body.open_run
            ? { run: { status: "running", last_heartbeat_ms_ago: 0 } }
            : undefined),
        });
        return json({
          message_id: id,
          ...(body.open_run
            ? {
                lease_id: `lease_${++leases}`,
                heartbeat_interval_ms: heartbeatIntervalMs,
              }
            : undefined),
        });
      }
      const write = path.match(/^\/threads\/remote-1\/messages\/([^/]+)$/);
      if (method === "PUT" && write) {
        const row = rows.find((r) => r.id === write[1]);
        if (row) row.content = body.content;
        return json({});
      }
      if (/^\/threads\/remote-1\/runs\/[^/]+\/heartbeat$/.test(path))
        return json({ heartbeat_interval_ms: heartbeatIntervalMs });
      if (/^\/threads\/remote-1\/runs\/[^/]+\/end$/.test(path)) return json({});
      return json({});
    },
  );
  return { rows, calls, fetchMock };
};

const createsWith = (calls: Call[], openRun: boolean) =>
  calls.filter(
    (c) =>
      c.method === "POST" &&
      c.path === "/threads/remote-1/messages" &&
      !!c.body.open_run === openRun,
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

const renderApp = async (staleAfter?: number) => {
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
  const Capture = () => {
    aui = useAui();
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
  render(<App />);
  await act(async () => {
    await aui.threads.getLoadThreadsPromise();
  });
  return { agent, getAui: () => aui, getRuntime: () => runtime };
};

const assistantRow = (
  last_heartbeat_ms_ago: number,
  status: "running" | "ended" = "running",
): Row => ({
  id: "a1",
  parent_id: "u1",
  format: "aui/v0",
  content: {
    role: "assistant",
    content: [{ type: "text", text: "half an answer" }],
    status: { type: "incomplete", reason: "cancelled" },
  },
  external_id: "a1",
  run: { status, last_heartbeat_ms_ago },
});
const userRow: Row = {
  id: "u1",
  parent_id: null,
  format: "aui/v0",
  content: { role: "user", content: [{ type: "text", text: "hello" }] },
  external_id: "u1",
};

let server: ReturnType<typeof createServer>;
const useServer = (rows?: Row[], heartbeatIntervalMs?: number) => {
  server = createServer(rows, heartbeatIntervalMs);
  vi.stubGlobal("fetch", server.fetchMock);
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
  it("opens a lease when the run starts, heartbeats on the server's interval, writes as its holder and ends it when the run finishes", async () => {
    useServer([], 30);
    const { agent, getAui } = await renderApp();

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(agent.runs).toHaveLength(1));
    await waitFor(() =>
      expect(createsWith(server.calls, true)).toHaveLength(1),
    );
    const open = createsWith(server.calls, true)[0]!;
    expect(open.body).toMatchObject({
      format: "aui/v0",
      parent_id: "msg_1",
      content: { role: "assistant" },
    });

    await waitFor(() =>
      expect(
        server.calls.filter((c) => c.path.endsWith("/runs/lease_1/heartbeat"))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );

    await act(async () => {
      agent.runs[0]!.finish();
    });
    await waitFor(() =>
      expect(
        server.calls.some(
          (c) => c.method === "POST" && c.path.endsWith("/runs/lease_1/end"),
        ),
      ).toBe(true),
    );
    const end = server.calls.find((c) => c.path.endsWith("/runs/lease_1/end"))!;
    expect(end.body).toEqual({ reason: "done" });
    const final = server.calls.filter(
      (c) => c.method === "PUT" && c.body.lease_id === "lease_1",
    );
    expect(final.length).toBeGreaterThan(0);
    expect(JSON.stringify(final.at(-1)!.body.content)).toContain(
      "partial answer",
    );
    expect(createsWith(server.calls, true)).toHaveLength(1);
    const reply = getAui().thread.getState().messages[1]!;
    expect(reply.id).toBe("agent-msg-1");
  });

  it("shows a reloaded run quiet for longer than staleAfter as interrupted; Resume posts a sibling with its own lease and runs the agent again", async () => {
    useServer([userRow, assistantRow(45_000)]);
    const { agent, getAui, getRuntime } = await renderApp();
    await act(async () => {
      await getRuntime().threads.switchToThread("remote-1");
    });
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );
    const stale = getAui().thread.message({ index: 1 });
    await waitFor(() => expect(stale.getState().runState).toBe("stale"));

    await act(async () => {
      stale.reload();
    });
    await waitFor(() => expect(agent.runs).toHaveLength(1));
    await waitFor(() =>
      expect(createsWith(server.calls, true)).toHaveLength(1),
    );
    expect(createsWith(server.calls, true)[0]!.body).toMatchObject({
      parent_id: "u1",
      open_run: true,
    });
    await act(async () => {
      agent.runs[0]!.finish();
    });
    await waitFor(() =>
      expect(
        server.calls.some((c) => c.path.endsWith("/runs/lease_1/end")),
      ).toBe(true),
    );
    expect(
      server.calls.some((c) => c.method === "PUT" && c.path.endsWith("/a1")),
    ).toBe(false);
    const messages = getAui().thread.getState().messages;
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.id).not.toBe("a1");
  });

  it("shows a reloaded run with a recent beat as in progress, and staleAfter moves the line", async () => {
    useServer([userRow, assistantRow(5_000)]);
    const { getAui, getRuntime } = await renderApp();
    await act(async () => {
      await getRuntime().threads.switchToThread("remote-1");
    });
    await waitFor(() =>
      expect(getAui().thread.message({ index: 1 }).getState().runState).toBe(
        "in-progress",
      ),
    );
    cleanup();

    useServer([userRow, assistantRow(5_000)]);
    const short = await renderApp(2_000);
    await act(async () => {
      await short.getRuntime().threads.switchToThread("remote-1");
    });
    await waitFor(() =>
      expect(
        short.getAui().thread.message({ index: 1 }).getState().runState,
      ).toBe("stale"),
    );
  });

  it("loads an ended run as a plain message", async () => {
    useServer([userRow, assistantRow(90_000, "ended")]);
    const { getAui, getRuntime } = await renderApp();
    await act(async () => {
      await getRuntime().threads.switchToThread("remote-1");
    });
    await waitFor(() =>
      expect(getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(
      getAui().thread.message({ index: 1 }).getState().runState,
    ).toBeUndefined();
  });
});
