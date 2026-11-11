// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { HttpAgent, type RunAgentInput } from "@ag-ui/client";
import {
  AssistantRuntimeProvider,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useThreadReplyState,
  useThreadResume,
  useThreadRefreshRun,
} from "@assistant-ui/core/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { AssistantCloud } from "assistant-cloud";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

// The real AssistantCloud client runs against this in-memory server, which keeps run leases on the thread the way Assistant Cloud v0.2.11 does. `legacy` serves v0.2.10 instead: leases only on a message (`open_run`), and no thread `run` in lists.
type Row = {
  id: string;
  parent_id: string | null;
  format: string;
  content: unknown;
  external_id: string | null;
};

type Lease = {
  id: string;
  status: "running" | "ended";
  message_id: string | null;
  parent_id: string | null;
  quiet_ms: number;
  created: number;
};

type Call = { method: string; path: string; body: any; status: number };

const createServer = ({
  rows: initialRows = [],
  leases: initialLeases = [],
  heartbeatIntervalMs = 20_000,
  legacy = false,
}: {
  rows?: Row[];
  leases?: Omit<Lease, "id" | "created">[];
  heartbeatIntervalMs?: number;
  legacy?: boolean;
} = {}) => {
  const rows = [...initialRows];
  let leaseCount = 0;
  const leases: Lease[] = initialLeases.map((lease) => ({
    ...lease,
    id: `old_lease_${++leaseCount}`,
    created: leaseCount,
  }));
  const calls: Call[] = [];
  let created = 0;
  const at = new Date(0).toISOString();
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const path = url.pathname.replace(/^\/v1/, "");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const call: Call = { method, path, body, status: 200 };
      calls.push(call);
      const json = (value: unknown, status = 200) => {
        call.status = status;
        return new Response(JSON.stringify(value), {
          status,
          headers: { "content-type": "application/json" },
        });
      };
      const leaseRun = (lease: Lease) => ({
        status: lease.status,
        last_heartbeat_ms_ago: lease.quiet_ms,
      });
      const supersede = () => {
        for (const lease of leases)
          if (lease.status === "running") lease.status = "ended";
      };
      const open = (fields: Partial<Lease>) => {
        supersede();
        const lease: Lease = {
          id: `lease_${++leaseCount}`,
          status: "running",
          message_id: null,
          parent_id: null,
          quiet_ms: 0,
          created: leaseCount,
          ...fields,
        };
        leases.push(lease);
        return lease;
      };
      const insert = (fields: Omit<Row, "id">) => {
        const id = `msg_${++created}`;
        rows.push({ id, ...fields });
        return id;
      };

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
        const running = leases
          .filter((lease) => lease.status === "running")
          .sort((a, b) => b.created - a.created)[0];
        return json({
          messages: [...rows].reverse().map((row, height) => {
            const lease = leases
              .filter((l) => l.message_id === row.id)
              .sort((a, b) => b.created - a.created)[0];
            return {
              ...row,
              height,
              created_at: at,
              updated_at: at,
              run: lease ? leaseRun(lease) : null,
            };
          }),
          ...(legacy
            ? undefined
            : {
                run: running
                  ? {
                      status: "running",
                      message_id: running.message_id,
                      parent_id: running.parent_id,
                      last_heartbeat_ms_ago: running.quiet_ms,
                    }
                  : null,
              }),
        });
      }
      if (method === "POST" && path === "/threads/remote-1/runs") {
        if (legacy) return json({ error: "Not found" }, 404);
        const lease = open({ parent_id: body.parent_id ?? null });
        return json(
          { lease_id: lease.id, heartbeat_interval_ms: heartbeatIntervalMs },
          201,
        );
      }
      if (method === "POST" && path === "/threads/remote-1/messages") {
        if (body.lease_id) {
          const lease = leases.find((l) => l.id === body.lease_id);
          if (!lease) return json({ error: "lease_mismatch" }, 409);
          if (lease.status === "ended")
            return json({ error: "run_ended" }, 409);
          const existing = rows.find((r) => r.external_id === body.external_id);
          if (existing) {
            if (lease.message_id && lease.message_id !== existing.id)
              return json({ error: "lease_mismatch" }, 409);
            lease.message_id = existing.id;
            existing.content = body.content;
            return json({ message_id: existing.id });
          }
          if (lease.message_id) return json({ error: "lease_mismatch" }, 409);
          const id = insert({
            parent_id: body.parent_id ?? lease.parent_id,
            format: body.format,
            content: body.content,
            external_id: body.external_id,
          });
          lease.message_id = id;
          lease.quiet_ms = 0;
          return json({ message_id: id }, 201);
        }
        const id = insert({
          parent_id: body.parent_id,
          format: body.format,
          content: body.content,
          external_id: body.external_id ?? null,
        });
        if (!body.open_run) return json({ message_id: id }, 201);
        const lease = open({ message_id: id, parent_id: body.parent_id });
        return json(
          {
            message_id: id,
            lease_id: lease.id,
            heartbeat_interval_ms: heartbeatIntervalMs,
          },
          201,
        );
      }
      const write = path.match(/^\/threads\/remote-1\/messages\/([^/]+)$/);
      if (method === "PUT" && write) {
        const row = rows.find((r) => r.id === write[1]);
        if (body.lease_id) {
          const lease = leases.find((l) => l.id === body.lease_id);
          if (!lease || (lease.message_id && lease.message_id !== write[1]))
            return json({ error: "lease_mismatch" }, 409);
          if (lease.status === "ended")
            return json({ error: "run_ended" }, 409);
          lease.message_id = write[1]!;
        }
        if (row) row.content = body.content;
        return json({});
      }
      const beat = path.match(
        /^\/threads\/remote-1\/runs\/([^/]+)\/heartbeat$/,
      );
      if (beat) {
        const lease = leases.find((l) => l.id === beat[1]);
        if (!lease) return json({ error: "Run not found" }, 404);
        if (lease.status === "ended") return json({ error: "run_ended" }, 409);
        lease.quiet_ms = 0;
        return json({ heartbeat_interval_ms: heartbeatIntervalMs });
      }
      const end = path.match(/^\/threads\/remote-1\/runs\/([^/]+)\/end$/);
      if (end) {
        const lease = leases.find((l) => l.id === end[1]);
        if (lease) lease.status = "ended";
        return json({});
      }
      return json({});
    },
  );
  return { rows, leases, calls, fetchMock };
};

const assistantCreates = (calls: Call[]) =>
  calls.filter(
    (c) =>
      c.method === "POST" &&
      c.path === "/threads/remote-1/messages" &&
      c.body.content.role === "assistant",
  );

const runOpens = (calls: Call[]) =>
  calls.filter(
    (c) => c.method === "POST" && c.path === "/threads/remote-1/runs",
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
    refresh?: ReturnType<typeof useThreadRefreshRun>;
  } = {};
  const Capture = () => {
    aui = useAui();
    hooks.replyState = useThreadReplyState();
    hooks.resume = useThreadResume();
    hooks.refresh = useThreadRefreshRun();
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
const assistantRow = (
  content: unknown[] = [{ type: "text", text: "half an answer" }],
): Row => ({
  id: "a1",
  parent_id: "u1",
  format: "aui/v0",
  content: {
    role: "assistant",
    content,
    status: { type: "incomplete", reason: "cancelled" },
  },
  external_id: "a1",
});
const lease = (
  quiet_ms: number,
  message_id: string | null = null,
  status: "running" | "ended" = "running",
) => ({ status, message_id, parent_id: "u1", quiet_ms });

const openThread = async (app: Awaited<ReturnType<typeof renderApp>>) => {
  await act(async () => {
    await app.getRuntime().threads.switchToThread("remote-1");
  });
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAgUiRuntime with Assistant Cloud thread run leases", () => {
  it("opens the thread's lease when the run starts without storing a reply, heartbeats, and stores the reply as the holder when the run finishes", async () => {
    const server = createServer({ heartbeatIntervalMs: 30 });
    const { agent, getAui } = await renderApp(server);

    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(agent.runs).toHaveLength(1));
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(1));
    expect(runOpens(server.calls)[0]!.body).toEqual({ parent_id: "msg_1" });
    await waitFor(() =>
      expect(
        server.calls.filter((c) => c.path.endsWith("/runs/lease_1/heartbeat"))
          .length,
      ).toBeGreaterThanOrEqual(2),
    );
    expect(assistantCreates(server.calls)).toHaveLength(0);
    expect(server.rows).toHaveLength(1);

    await act(async () => {
      agent.runs[0]!.finish();
    });
    await waitFor(() =>
      expect(
        server.calls.some((c) => c.path.endsWith("/runs/lease_1/end")),
      ).toBe(true),
    );
    const [reply] = assistantCreates(server.calls);
    expect(reply!.body).toMatchObject({
      parent_id: "msg_1",
      external_id: "agent-msg-1",
      lease_id: "lease_1",
    });
    expect(JSON.stringify(reply!.body.content)).toContain("partial answer");
    expect(assistantCreates(server.calls)).toHaveLength(1);
    expect(server.rows.map((r) => r.parent_id)).toEqual([null, "msg_1"]);
    expect(server.leases[0]).toMatchObject({
      status: "ended",
      message_id: "msg_2",
    });
    expect(getAui().thread.getState().messages[1]!.id).toBe("agent-msg-1");
  });

  it("leaves no message when the tab running the reply goes away before it writes", async () => {
    const server = createServer();
    const app = await renderApp(server);
    await act(async () => {
      app.getAui().thread.append("hello");
    });
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(1));
    // A closed tab sends nothing more: its requests never reach the server.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    app.unmount();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.rows.map((r) => r.id)).toEqual(["msg_1"]);
    expect(server.leases[0]!.status).toBe("running");
  });

  it("shows a thread another tab is answering as generating, with Refresh and no Resume", async () => {
    const server = createServer({ rows: [userRow], leases: [lease(2_000)] });
    const app = await renderApp(server);
    await openThread(app);
    await waitFor(() => expect(app.hooks.replyState).toBe("in-progress"));
    expect(app.getAui().thread.getState().messages).toHaveLength(1);
    expect(app.hooks.refresh?.disabled).toBe(false);
    expect(app.hooks.resume?.disabled).toBe(true);
  });

  it("shows a stale lease with the user's message last as interrupted; Resume runs the agent from it with no branch", async () => {
    const server = createServer({ rows: [userRow], leases: [lease(45_000)] });
    const app = await renderApp(server);
    await openThread(app);
    await waitFor(() => expect(app.hooks.replyState).toBe("interrupted"));
    await waitFor(() => expect(app.hooks.resume?.disabled).toBe(false));

    await act(async () => {
      app.hooks.resume!.resume();
    });
    await waitFor(() => expect(app.agent.runs).toHaveLength(1));
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(1));
    expect(runOpens(server.calls)[0]!.body).toEqual({ parent_id: "u1" });
    expect(server.leases[0]!.status).toBe("ended");
    await act(async () => {
      app.agent.runs[0]!.finish();
    });
    await waitFor(() => expect(assistantCreates(server.calls)).toHaveLength(1));
    expect(assistantCreates(server.calls)[0]!.body).toMatchObject({
      parent_id: "u1",
      lease_id: "lease_2",
    });
    expect(server.rows.filter((r) => r.parent_id === "u1")).toHaveLength(1);
    const messages = app.getAui().thread.getState().messages;
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(
      app.getAui().thread.message({ index: 1 }).getState().branchCount,
    ).toBe(1);
    expect(app.hooks.replyState).toBeUndefined();
  });

  it("shows a stale reply that stored content as an ordinary error; Regenerate branches beside it", async () => {
    const server = createServer({
      rows: [userRow, assistantRow()],
      leases: [lease(45_000, "a1")],
    });
    const app = await renderApp(server);
    await openThread(app);
    await waitFor(() =>
      expect(app.getAui().thread.getState().messages).toHaveLength(2),
    );
    const stale = app.getAui().thread.message({ index: 1 });
    await waitFor(() =>
      expect(stale.getState().status).toMatchObject({
        error: { code: "run_stale" },
      }),
    );
    expect(stale.getState().runState).toBeUndefined();
    expect(app.hooks.replyState).toBeUndefined();

    await act(async () => {
      stale.reload();
    });
    await waitFor(() => expect(app.agent.runs).toHaveLength(1));
    await act(async () => {
      app.agent.runs[0]!.finish();
    });
    await waitFor(() => expect(assistantCreates(server.calls)).toHaveLength(1));
    expect(
      server.calls.some((c) => c.method === "PUT" && c.path.endsWith("/a1")),
    ).toBe(false);
    expect(
      app.getAui().thread.message({ index: 1 }).getState().branchCount,
    ).toBe(2);
  });

  it("leaves out an empty reply an older client stored at run start; Resume answers the user's message without a branch or a delete", async () => {
    const server = createServer({
      rows: [userRow, assistantRow([])],
      leases: [lease(45_000, "a1")],
    });
    const app = await renderApp(server);
    await openThread(app);
    await waitFor(() => expect(app.hooks.replyState).toBe("interrupted"));
    expect(
      app
        .getAui()
        .thread.getState()
        .messages.map((m) => m.id),
    ).toEqual(["u1"]);

    await act(async () => {
      app.hooks.resume!.resume();
    });
    await waitFor(() => expect(app.agent.runs).toHaveLength(1));
    await act(async () => {
      app.agent.runs[0]!.finish();
    });
    await waitFor(() => expect(assistantCreates(server.calls)).toHaveLength(1));
    expect(server.calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(
      app.getAui().thread.message({ index: 1 }).getState().branchCount,
    ).toBe(1);

    // Reloaded, the thread still shows one answer: the empty row stays left out.
    cleanup();
    const again = await renderApp(server);
    await openThread(again);
    await waitFor(() =>
      expect(again.getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(
      again.getAui().thread.message({ index: 1 }).getState().branchCount,
    ).toBe(1);
    expect(again.hooks.replyState).toBeUndefined();
  });

  it("lets the newest of two concurrent runs win: the superseded tab stops writing", async () => {
    const server = createServer({ rows: [userRow], heartbeatIntervalMs: 30 });
    const first = await renderApp(server);
    await openThread(first);
    await waitFor(() => expect(first.hooks.resume?.disabled).toBe(false));
    await act(async () => {
      first.hooks.resume!.resume();
    });
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(1));

    const second = await renderApp(server);
    await openThread(second);
    await waitFor(() => expect(second.hooks.replyState).toBe("in-progress"));
    // The user sends again from the second tab anyway.
    await act(async () => {
      second.getAui().thread.append("hello again");
    });
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(2));
    await waitFor(() =>
      expect(
        server.calls.some(
          (c) => c.path.endsWith("/runs/lease_1/heartbeat") && c.status === 409,
        ),
      ).toBe(true),
    );

    await act(async () => {
      first.agent.runs[0]!.finish();
      second.agent.runs[0]!.finish();
    });
    await waitFor(() =>
      expect(
        server.calls.some((c) => c.path.endsWith("/runs/lease_2/end")),
      ).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const replies = assistantCreates(server.calls).filter(
      (c) => c.status < 400,
    );
    expect(replies.map((c) => c.body.lease_id)).toEqual(["lease_2"]);
  });

  it("stores the reply without a thread lease against a server before thread leases, and reads no reply state", async () => {
    const server = createServer({ legacy: true });
    const { agent, getAui, hooks } = await renderApp(server);
    await act(async () => {
      getAui().thread.append("hello");
    });
    await waitFor(() => expect(agent.runs).toHaveLength(1));
    await waitFor(() => expect(runOpens(server.calls)).toHaveLength(1));
    await act(async () => {
      agent.runs[0]!.finish();
    });
    await waitFor(() => expect(assistantCreates(server.calls)).toHaveLength(1));
    expect(assistantCreates(server.calls)[0]!.body.lease_id).toBeUndefined();
    expect(runOpens(server.calls)).toHaveLength(1);
    expect(hooks.replyState).toBeUndefined();
  });

  it("loads an ended run as a plain message", async () => {
    const server = createServer({
      rows: [userRow, assistantRow()],
      leases: [lease(90_000, "a1", "ended")],
    });
    const app = await renderApp(server);
    await openThread(app);
    await waitFor(() =>
      expect(app.getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(
      app.getAui().thread.message({ index: 1 }).getState().runState,
    ).toBeUndefined();
    expect(app.hooks.replyState).toBeUndefined();
  });
});
