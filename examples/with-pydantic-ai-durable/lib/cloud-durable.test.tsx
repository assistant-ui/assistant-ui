// @vitest-environment jsdom

import { useEffect, useMemo, useState } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import {
  HttpAgent,
  runHttpRequest,
  transformHttpEventStream,
  type RunAgentInput,
} from "@ag-ui/client";
import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useRuntimeAdapters,
  type AssistantRuntime,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDurableTakeover, withDurableRuns } from "./cloud-durable";

type AssistantClient = ReturnType<typeof useAui>;

// Both servers run in memory behind one fetch stub: Assistant Cloud at cloud.test, a DurableAGUI-like server at durable.test.

type Lease = { id: string; status: "running" | "ended"; beatAt: number };
type Row = {
  id: string;
  parent_id: string | null;
  format: string;
  content: any;
  external_id: string | null;
  lease?: Lease;
};
type Call = { tab: string; method: string; path: string; body: any };

const encoder = new TextEncoder();
const sse = (event: object) =>
  encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

const createCloud = (initialRows: Row[], externalId: string | null) => {
  const rows = [...initialRows];
  const calls: Call[] = [];
  let threadExternalId = externalId;
  let hasThread = rows.length > 0;
  let created = 0;
  let leases = 0;
  const at = new Date(0).toISOString();
  const findLease = (leaseId: string) =>
    rows.find((row) => row.lease?.id === leaseId)?.lease;
  const handle = (tab: string, method: string, path: string, body: any) => {
    calls.push({ tab, method, path, body });
    if (method === "GET" && path === "/threads") {
      return json({
        threads: hasThread
          ? [
              {
                id: "remote-1",
                title: "t",
                is_archived: false,
                external_id: threadExternalId,
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
    // Title generation after the first message.
    if (method === "POST" && path === "/runs/stream")
      return new Response("", { headers: { "content-type": "text/plain" } });
    if (method === "POST" && path === "/threads") {
      hasThread = true;
      threadExternalId = body.external_id ?? null;
      return json({ thread_id: "remote-1" });
    }
    if (method === "GET" && path === "/threads/remote-1/messages") {
      return json({
        messages: [...rows].reverse().map((row, height) => ({
          id: row.id,
          parent_id: row.parent_id,
          format: row.format,
          content: row.content,
          external_id: row.external_id,
          height,
          created_at: at,
          updated_at: at,
          run: row.lease
            ? {
                status: row.lease.status,
                last_heartbeat_ms_ago: Date.now() - row.lease.beatAt,
              }
            : null,
        })),
      });
    }
    if (method === "POST" && path === "/threads/remote-1/messages") {
      // Idempotent mirroring: an external id the thread holds rewrites that row.
      const existing = body.external_id
        ? rows.find((row) => row.external_id === body.external_id)
        : undefined;
      if (existing && body.open_run && existing.lease?.status === "running")
        return json({ error: "run_in_progress" }, 409);
      const parentId = body.parent_external_id
        ? rows.find((row) => row.external_id === body.parent_external_id)?.id
        : body.parent_id;
      const row: Row = existing ?? {
        id: `msg_${++created}`,
        parent_id: parentId ?? null,
        format: body.format,
        content: body.content,
        external_id: body.external_id ?? null,
      };
      row.content = body.content;
      if (!existing) rows.push(row);
      if (!body.open_run) return json({ message_id: row.id });
      row.lease = {
        id: `lease_${++leases}`,
        status: "running",
        beatAt: Date.now(),
      };
      return json({
        message_id: row.id,
        lease_id: row.lease.id,
        heartbeat_interval_ms: 50,
      });
    }
    const write = path.match(/^\/threads\/remote-1\/messages\/([^/]+)$/);
    if (method === "PUT" && write) {
      const row = rows.find((r) => r.id === write[1]);
      if (!row) return json({ error: "Message not found" }, 404);
      if (body.lease_id) {
        if (!row.lease || row.lease.id !== body.lease_id)
          return json({ error: "lease_mismatch" }, 409);
        if (row.lease.status !== "running")
          return json({ error: "run_ended" }, 409);
        row.lease.beatAt = Date.now();
      }
      row.content = body.content;
      return json({});
    }
    if (method === "DELETE" && path === "/threads/remote-1/messages") {
      for (const id of body.message_ids as string[]) {
        const index = rows.findIndex((r) => r.id === id);
        if (index !== -1) rows.splice(index, 1);
      }
      return json({});
    }
    const beat = path.match(/^\/threads\/remote-1\/runs\/([^/]+)\/heartbeat$/);
    if (beat) {
      const lease = findLease(beat[1]!);
      if (lease?.status === "running") lease.beatAt = Date.now();
      return json({ heartbeat_interval_ms: 50 });
    }
    const end = path.match(/^\/threads\/remote-1\/runs\/([^/]+)\/end$/);
    if (end) {
      const lease = findLease(end[1]!);
      if (lease) lease.status = "ended";
      return json({});
    }
    return json({});
  };
  return { rows, calls, handle };
};

type DurableRecord = { messages: unknown[]; running: boolean };

// One durable thread whose run streams "partial", then " answer" when the test finishes it. Every connection replays from the first frame.
const createDurable = (threadId: string, record: DurableRecord | null) => {
  const state = {
    record,
    frames: [] as Uint8Array[],
    listeners: new Set<ReadableStreamDefaultController<Uint8Array>>(),
    ended: false,
    connects: [] as string[],
    starts: [] as RunAgentInput[],
    getThreads: [] as string[],
  };
  const push = (event: object) => {
    const frame = sse(event);
    state.frames.push(frame);
    for (const listener of state.listeners) listener.enqueue(frame);
  };
  const begin = (input: {
    messages: unknown[];
    runId: string;
    threadId?: string;
  }) => {
    state.record = { messages: input.messages, running: true };
    state.frames = [];
    state.ended = false;
    push({
      type: "RUN_STARTED",
      threadId: input.threadId ?? threadId,
      runId: input.runId,
    });
    push({
      type: "TEXT_MESSAGE_START",
      messageId: "stream-a1",
      role: "assistant",
    });
    push({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "stream-a1",
      delta: "partial",
    });
  };
  const finish = () => {
    push({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "stream-a1",
      delta: " answer",
    });
    push({ type: "TEXT_MESSAGE_END", messageId: "stream-a1" });
    push({ type: "RUN_FINISHED", threadId, runId: "run-1" });
    state.ended = true;
    // The server regenerates assistant ids when it stores the finished run.
    state.record = {
      running: false,
      messages: [
        ...(state.record?.messages ?? []),
        { id: "final-a1", role: "assistant", content: "partial answer" },
      ],
    };
    for (const listener of state.listeners) listener.close();
    state.listeners.clear();
  };
  const stream = (signal: AbortSignal | null | undefined) =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const frame of state.frames) controller.enqueue(frame);
          if (state.ended) {
            controller.close();
            return;
          }
          state.listeners.add(controller);
          signal?.addEventListener(
            "abort",
            () => {
              if (!state.listeners.delete(controller)) return;
              controller.close();
            },
            { once: true },
          );
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  const handle = (
    method: string,
    path: string,
    body: any,
    signal?: AbortSignal | null,
  ) => {
    if (method === "POST" && path === "/agent") {
      state.starts.push(body);
      begin(body);
      return stream(signal);
    }
    const thread = path.match(/^\/threads\/([^/]+)(\/stream)?$/);
    const id = thread ? decodeURIComponent(thread[1]!) : undefined;
    if (method === "GET" && thread && !thread[2]) {
      state.getThreads.push(id!);
      return state.record
        ? json({ id: threadId, ...state.record })
        : json({ error: "not found" }, 404);
    }
    if (method === "GET" && thread?.[2]) {
      state.connects.push(id!);
      return stream(signal);
    }
    return json({ error: "not found" }, 404);
  };
  return { state, begin, finish, handle };
};

let cloud: ReturnType<typeof createCloud>;
let durable: ReturnType<typeof createDurable>;

const useServers = (
  rows: Row[],
  record: DurableRecord | null,
  { threadId = "durable-1", externalId = "durable-1" as string | null } = {},
) => {
  cloud = createCloud(rows, externalId);
  durable = createDurable(threadId, record);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (url.host === "durable.test")
        return durable.handle(method, url.pathname, body, init?.signal);
      const headers = new Headers(init?.headers);
      return cloud.handle(
        headers.get("Aui-User-Id") ?? "",
        method,
        url.pathname.replace(/^\/v1/, ""),
        body,
      );
    }),
  );
};

/** The example's DurableHttpAgent, cut down: `connect()` follows the thread's run. */
class DurableTestAgent extends HttpAgent {
  constructor(threadId: string) {
    super({ url: "http://durable.test/agent", threadId });
  }
  override connectAgent(...args: Parameters<HttpAgent["connectAgent"]>) {
    this.abortController = new AbortController();
    return super.connectAgent(...args);
  }
  protected override connect(input: RunAgentInput) {
    return transformHttpEventStream(
      runHttpRequest(() =>
        fetch(
          `http://durable.test/threads/${encodeURIComponent(input.threadId)}/stream`,
          { signal: this.abortController.signal },
        ),
      ),
    );
  }
  override abortRun() {}
  async getThread(threadId: string) {
    const response = await fetch(
      `http://durable.test/threads/${encodeURIComponent(threadId)}`,
    );
    if (response.status === 404) return null;
    return (await response.json()) as {
      messages: unknown[];
      running: boolean;
    };
  }
}

type Tab = {
  getAui: () => AssistantClient;
  getRuntime: () => AssistantRuntime;
};

// `tab` rides in the Aui-User-Id header so calls can be told apart; the in-memory cloud ignores ownership.
const openTab = async (tab: string, staleAfter = 30_000): Promise<Tab> => {
  const client = new AssistantCloud({
    baseUrl: "http://cloud.test",
    apiKey: "key",
    userId: tab,
    workspaceId: "workspace",
    telemetry: false,
  });
  let aui: AssistantClient | undefined;
  let runtime!: AssistantRuntime;
  const Capture = () => {
    aui = useAui();
    return null;
  };
  const App = () => {
    const adapter = useCloudThreadListAdapter({
      cloud: client,
      staleAfter,
      // The durable server keys threads by the cloud thread's external id.
      create: async (threadId) => ({ externalId: threadId }),
    });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function DurableThreadRuntime() {
        const threadId = useAuiState(
          (s) => s.threadListItem.externalId ?? s.threadListItem.id,
        );
        const [agent] = useState(() => new DurableTestAgent(threadId));
        useEffect(() => {
          agent.threadId = threadId;
        }, [agent, threadId]);
        const cloudHistory = useRuntimeAdapters()?.history;
        const history = useMemo(
          () => cloudHistory && withDurableRuns(cloudHistory, agent),
          [cloudHistory, agent],
        );
        const runtime = useAgUiRuntime({
          agent,
          ...(history ? { adapters: { history } } : undefined),
        });
        useDurableTakeover(runtime, history);
        return runtime;
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  await waitFor(() => expect(aui).toBeDefined());
  await act(async () => {
    await aui!.threads.getLoadThreadsPromise();
  });
  return { getAui: () => aui!, getRuntime: () => runtime };
};

const openThread = async (...tabs: Tab[]) => {
  await act(async () => {
    await Promise.all(
      tabs.map((tab) => tab.getRuntime().threads.switchToThread("remote-1")),
    );
  });
};

const textOf = (message: ThreadMessage | undefined) =>
  message?.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

const shown = (tab: Tab) =>
  tab
    .getAui()
    .thread.getState()
    .messages.map((m) => `${m.role}: ${textOf(m)}`);

const assistantRows = () =>
  cloud.rows.filter((row) => row.content?.role === "assistant");

const rowText = (row: Row | undefined) =>
  (row?.content?.content ?? [])
    .map((part: any) => (part.type === "text" ? part.text : ""))
    .join("");

const writesBy = (tab: string) =>
  cloud.calls.filter(
    (call) =>
      call.tab === tab &&
      call.method !== "GET" &&
      call.path.startsWith("/threads/remote-1/messages"),
  );

const userRow: Row = {
  id: "u1",
  parent_id: null,
  format: "aui/v0",
  content: { role: "user", content: [{ type: "text", text: "hello" }] },
  external_id: "u1",
};

// The reply a closed tab left behind: written mid-run, its lease last beaten `quietMs` ago.
const partialRow = (quietMs: number): Row => ({
  id: "a1",
  parent_id: "u1",
  format: "aui/v0",
  content: {
    role: "assistant",
    content: [{ type: "text", text: "half an answer" }],
    status: { type: "running" },
  },
  external_id: "stream-a1",
  lease: { id: "lease_old", status: "running", beatAt: Date.now() - quietMs },
});

const runInput = {
  runId: "run-1",
  messages: [{ id: "u1", role: "user", content: "hello" }],
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAgUiRuntime with Assistant Cloud history and durable runs", () => {
  it("(a) rejoins a run still going in place of the partial reply a closed tab stored, and stores the answer once", async () => {
    useServers([userRow, partialRow(45_000)], null);
    durable.begin(runInput);
    const tab = await openTab("tab-b");
    await openThread(tab);

    await waitFor(() => expect(durable.state.connects).toEqual(["durable-1"]));
    await waitFor(() =>
      expect(shown(tab)).toEqual(["user: hello", "assistant: partial"]),
    );
    expect(cloud.rows.some((row) => row.id === "a1")).toBe(false);

    await act(async () => {
      durable.finish();
    });
    await waitFor(() =>
      expect(shown(tab)).toEqual(["user: hello", "assistant: partial answer"]),
    );
    await waitFor(() =>
      expect(rowText(assistantRows()[0])).toBe("partial answer"),
    );
    expect(assistantRows()).toHaveLength(1);
    expect(assistantRows()[0]!.parent_id).toBe("u1");
    await waitFor(() =>
      expect(assistantRows()[0]!.lease?.status).toBe("ended"),
    );
    expect(durable.state.starts).toHaveLength(0);
  });

  it("(a) after a reload, waits while the closed tab's lease is fresh, then takes the run over once it goes stale", async () => {
    useServers([userRow, partialRow(0)], null);
    durable.begin(runInput);
    const tab = await openTab("tab-b", 300);
    await openThread(tab);

    await waitFor(() =>
      expect(tab.getAui().thread.getState().messages).toHaveLength(2),
    );
    // Still inside the lease's fresh window.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(durable.state.connects).toEqual([]);
    expect(durable.state.starts).toEqual([]);

    await waitFor(() => expect(durable.state.connects).toEqual(["durable-1"]), {
      timeout: 8_000,
    });
    await waitFor(() =>
      expect(shown(tab)).toEqual(["user: hello", "assistant: partial"]),
    );
    await act(async () => {
      durable.finish();
    });
    await waitFor(() =>
      expect(rowText(assistantRows()[0])).toBe("partial answer"),
    );
    expect(assistantRows()).toHaveLength(1);
    expect(shown(tab)).toEqual(["user: hello", "assistant: partial answer"]);
    // The takeover followed the run; it never started another.
    expect(durable.state.starts).toEqual([]);
  }, 15_000);

  it("(b) stores the server's answer for a run that finished with no tab open, in place of the interrupted reply", async () => {
    useServers([userRow, partialRow(45_000)], null);
    durable.begin(runInput);
    durable.finish();
    const tab = await openTab("tab-b");
    await openThread(tab);

    await waitFor(() =>
      expect(shown(tab)).toEqual(["user: hello", "assistant: partial answer"]),
    );
    expect(durable.state.connects).toEqual([]);
    expect(assistantRows()).toHaveLength(1);
    expect(assistantRows()[0]).toMatchObject({
      external_id: "final-a1",
      parent_id: "u1",
    });
    expect(rowText(assistantRows()[0])).toBe("partial answer");
    const reply = tab.getAui().thread.getState().messages[1]!;
    expect(reply.status?.type).toBe("complete");
  });

  it("(b) two tabs that open the finished thread at once store one answer", async () => {
    useServers([userRow, partialRow(45_000)], null);
    durable.begin(runInput);
    durable.finish();
    const first = await openTab("tab-b");
    const second = await openTab("tab-c");
    await openThread(first, second);

    for (const tab of [first, second]) {
      await waitFor(() =>
        expect(shown(tab)).toEqual([
          "user: hello",
          "assistant: partial answer",
        ]),
      );
    }
    expect(cloud.rows.map((row) => row.external_id)).toEqual([
      "u1",
      "final-a1",
    ]);
  });

  it("(b) leaves a thread whose reply settled in the store alone, without asking the server", async () => {
    const settled: Row = {
      ...partialRow(0),
      content: {
        role: "assistant",
        content: [{ type: "text", text: "stored answer" }],
        status: { type: "complete", reason: "stop" },
      },
      lease: { id: "lease_old", status: "ended", beatAt: 0 },
    };
    useServers([userRow, settled], null);
    durable.begin(runInput);
    durable.finish();
    const tab = await openTab("tab-b");
    await openThread(tab);

    await waitFor(() =>
      expect(shown(tab)).toEqual(["user: hello", "assistant: stored answer"]),
    );
    expect(durable.state.getThreads).toEqual([]);
    expect(writesBy("tab-b")).toEqual([]);
  });

  it("(c) a second tab follows the tab that is running, writes nothing and shows the answer once that tab stores it", async () => {
    useServers([], null, { externalId: null });
    const running = await openTab("tab-a");
    await act(async () => {
      running.getAui().thread.append("hello");
    });
    await waitFor(() =>
      expect(shown(running)).toEqual(["user: hello", "assistant: partial"]),
    );
    await waitFor(() => expect(assistantRows()).toHaveLength(1));
    // The durable server keys the thread by the AG-UI thread id, which is the cloud thread's external id.
    const threadId = durable.state.starts[0]!.threadId;
    expect(threadId).toBeTruthy();
    expect(
      cloud.calls.find((c) => c.method === "POST" && c.path === "/threads")!
        .body.external_id,
    ).toBe(threadId);

    // A short staleAfter, so the follower looks at the reply several times while the running tab keeps beating.
    const follower = await openTab("tab-b", 1_000);
    await openThread(follower);
    await waitFor(() =>
      expect(follower.getAui().thread.getState().messages).toHaveLength(2),
    );
    expect(durable.state.connects).toEqual([]);

    await act(async () => {
      durable.finish();
    });
    await waitFor(() =>
      expect(shown(running)).toEqual([
        "user: hello",
        "assistant: partial answer",
      ]),
    );
    await waitFor(
      () =>
        expect(shown(follower)).toEqual([
          "user: hello",
          "assistant: partial answer",
        ]),
      { timeout: 12_000 },
    );
    expect(assistantRows()).toHaveLength(1);
    expect(rowText(assistantRows()[0])).toBe("partial answer");
    expect(writesBy("tab-b")).toEqual([]);
    expect(durable.state.connects).toEqual([]);
  }, 15_000);

  it("(c) a stale reply the server can't account for is read again once, not in a loop", async () => {
    useServers([userRow, partialRow(0)], null);
    const tab = await openTab("tab-b", 300);
    await openThread(tab);
    await waitFor(
      () =>
        expect(
          tab.getAui().thread.getState().messages[1]?.status,
        ).toMatchObject({ error: { code: "run_stale" } }),
      { timeout: 8_000 },
    );
    await waitFor(() => expect(durable.state.getThreads).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    expect(durable.state.getThreads).toHaveLength(1);
    expect(durable.state.connects).toEqual([]);
    expect(durable.state.starts).toEqual([]);
  }, 15_000);

  it("(c) two tabs that rejoin the same run at once store one answer", async () => {
    useServers([userRow, partialRow(45_000)], null);
    durable.begin(runInput);
    const first = await openTab("tab-b");
    const second = await openTab("tab-c");
    await openThread(first, second);

    await waitFor(() => expect(durable.state.connects).toHaveLength(2));
    for (const tab of [first, second]) {
      await waitFor(() =>
        expect(shown(tab)).toEqual(["user: hello", "assistant: partial"]),
      );
    }
    await act(async () => {
      durable.finish();
    });
    for (const tab of [first, second]) {
      await waitFor(() =>
        expect(shown(tab)).toEqual([
          "user: hello",
          "assistant: partial answer",
        ]),
      );
    }
    await waitFor(() =>
      expect(rowText(assistantRows()[0])).toBe("partial answer"),
    );
    expect(assistantRows()).toHaveLength(1);
    expect(cloud.rows.some((row) => row.id === "a1")).toBe(false);
  });
});
