// assistant-ui/assistant-ui#10441: an assistant a MESSAGES_SNAPSHOT adds and moves the run onto
// is written to history, so it is still there after a reload.
import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { HttpAgent } from "@ag-ui/client";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => {
  for (let i = 0; i < 8; i++) await tick();
};
const userMessage = {
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  startRun: true,
} as unknown as AppendMessage;

type Row = { id: string; status: string | undefined };

async function run(events: (requestMessages: any[]) => object[][]) {
  const rows = new Map<string, Row>();
  const writes: string[] = [];
  const history = {
    load: async () => ({ headId: null, messages: [] }),
    append: async (item: any) => {
      writes.push(`append ${item.message.id}`);
      rows.set(item.message.id, {
        id: item.message.id,
        status: item.message.status?.type,
      });
    },
    // ThreadHistoryAdapter.update's contract: an upsert keyed on the message id
    update: async (item: any) => {
      writes.push(`update ${item.message.id}`);
      rows.set(item.message.id, {
        id: item.message.id,
        status: item.message.status?.type,
      });
    },
  };
  let write!: (e: object) => void;
  let close!: () => void;
  let requestMessages: any[] = [];
  const agent = new HttpAgent({
    url: "https://agent.test",
    fetch: async (_url: unknown, init: RequestInit) => {
      const encoder = new TextEncoder();
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start: (c) => void (controller = c),
      });
      requestMessages = JSON.parse(init.body as string).messages ?? [];
      write = (e) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      close = () => controller.close();
      return new Response(body, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  });
  const core = new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
    history: history as any,
  });
  const sending = core.append(userMessage).catch(() => {});
  for (let i = 0; i < 50 && !write; i++) await tick();
  for (const batch of events(requestMessages)) {
    for (const e of batch) write(e);
    await settle();
  }
  close();
  await sending;
  await settle();
  const shown = core
    .getMessages()
    .map((m: any) => `${m.id}:${m.status?.type ?? "-"}`);
  return { rows, writes, shown };
}

const start = [
  { type: "RUN_STARTED", threadId: "t", runId: "r" },
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a1" },
];
const end = { type: "TEXT_MESSAGE_END", messageId: "answer" };
const moveSnapshot = (req: any[]) => ({
  type: "MESSAGES_SNAPSHOT",
  messages: [
    ...req,
    { id: "answer", role: "assistant", content: "a1" },
    { id: "other", role: "assistant", content: "o" },
  ],
});

describe("ag-ui: a snapshot's new head and the history adapter", () => {
  it("stores the new head after one head-move snapshot and RUN_FINISHED", async () => {
    const { rows, writes, shown } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(shown).toContain("other:complete");
    expect(rows.get("other")?.status, writes.join(", ")).toBe("complete");
  });

  it("stores the new head after one head-move snapshot and RUN_ERROR", async () => {
    const { rows, writes, shown } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [{ type: "RUN_ERROR", message: "boom" }],
    ]);
    // Which message takes the error depends on whether the run moved onto
    // "other"; either way history holds what the thread shows.
    const other = shown.find((entry) => entry.startsWith("other:"));
    expect(["other:incomplete", "other:complete"]).toContain(other);
    expect(`other:${rows.get("other")?.status}`, writes.join(", ")).toBe(other);
  });

  it("stores a snapshot-only answer that a second snapshot repeats", async () => {
    const snapshot = (req: any[]) => ({
      type: "MESSAGES_SNAPSHOT",
      messages: [...req, { id: "only", role: "assistant", content: "o" }],
    });
    const { rows, writes } = await run((req) => [
      [{ type: "RUN_STARTED", threadId: "t", runId: "r" }, snapshot(req)],
      [snapshot(req)],
      [{ type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("only")?.status, writes.join(", ")).toBe("complete");
  });

  it("stores an answer that arrives only in a snapshot", async () => {
    const { rows, writes, shown } = await run((req) => [
      [
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [...req, { id: "only", role: "assistant", content: "o" }],
        },
      ],
      [{ type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(shown).toContain("only:complete");
    expect(rows.get("only")?.status, writes.join(", ")).toBe("complete");
    expect(writes.filter((w) => w.endsWith(" only"))).toHaveLength(1);
  });

  it("control: a second snapshot after the head move stores the new head", async () => {
    const { rows, writes, shown } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [moveSnapshot(req)],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("other")?.status, JSON.stringify({ writes, shown })).toBe(
      "complete",
    );
  });

  it("control: the streamed answer without a snapshot is stored", async () => {
    const { rows } = await run(() => [
      start,
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("answer")?.status).toBe("complete");
  });
});
