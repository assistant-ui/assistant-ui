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

type Row = { id: string; status: string | undefined; text: string };

// Follows the ThreadHistoryAdapter contract: both writes upsert by message
// id, and only append moves the stored head.
function createHistory(writes: string[]) {
  const items = new Map<string, any>();
  let headId: string | null = null;
  const store = (item: any, moveHead: boolean) => {
    if (moveHead) headId = item.message.id;
    items.set(item.message.id, structuredClone(item));
  };
  return {
    rows: () =>
      new Map<string, Row>(
        [...items.values()].map((item) => [
          item.message.id,
          {
            id: item.message.id,
            status: item.message.status?.type,
            text: item.message.content
              .flatMap((part: any) => (part.type === "text" ? [part.text] : []))
              .join(""),
          },
        ]),
      ),
    load: async () => ({ headId, messages: [...items.values()] }),
    append: async (item: any) => {
      writes.push(`append ${item.message.id}`);
      store(item, true);
    },
    update: async (item: any) => {
      writes.push(`update ${item.message.id}`);
      store(item, false);
    },
  };
}

async function reload(history: ReturnType<typeof createHistory>) {
  const core = new AgUiThreadController({
    agent: new HttpAgent({ url: "https://agent.test" }),
    logger: makeLogger(),
    showThinking: false,
    history: history as any,
  });
  await core.__internal_load();
  return core.getMessages().map((m: any) => `${m.id}:${m.status?.type ?? "-"}`);
}

async function run(
  events: (requestMessages: any[]) => object[][],
  afterEvents?: (core: AgUiThreadController) => Promise<void>,
) {
  const writes: string[] = [];
  const history = createHistory(writes);
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
  await afterEvents?.(core);
  close();
  await sending;
  await settle();
  const shown = core
    .getMessages()
    .map((m: any) => `${m.id}:${m.status?.type ?? "-"}`);
  return {
    rows: history.rows(),
    writes,
    shown,
    reloaded: await reload(history),
  };
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
    const { rows, writes, shown, reloaded } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(shown).toContain("other:complete");
    expect(rows.get("other")?.status, writes.join(", ")).toBe("complete");
    expect(writes.filter((write) => write === "append other")).toHaveLength(1);
    expect(writes.filter((write) => write.endsWith(" other"))).toHaveLength(1);
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it.each([false, true])(
    "stores the snapshot-selected answer on EOF without a later update (previous text ended: %s)",
    async (textEnded) => {
      const { rows, writes, shown, reloaded } = await run((req) => [
        start,
        ...(textEnded ? [[end]] : []),
        [moveSnapshot(req)],
      ]);

      expect(shown).toContain("other:complete");
      expect(rows.get("other"), writes.join(", ")).toEqual({
        id: "other",
        status: "complete",
        text: "o",
      });
      expect(writes.filter((write) => write === "append other")).toHaveLength(
        1,
      );
      expect(writes.filter((write) => write.endsWith(" other"))).toHaveLength(
        1,
      );
      expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
    },
  );

  it("control: stores a complete snapshot-only answer on EOF without a later update", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
      [
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [...req, { id: "only", role: "assistant", content: "o" }],
        },
      ],
    ]);

    expect(shown).toContain("only:complete");
    expect(rows.get("only"), writes.join(", ")).toEqual({
      id: "only",
      status: "complete",
      text: "o",
    });
    expect(writes.filter((write) => write === "append only")).toHaveLength(1);
    expect(writes.filter((write) => write.endsWith(" only"))).toHaveLength(1);
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("control: stores the snapshot-selected answer exactly once when Stop precedes EOF", async () => {
    const { rows, writes, shown, reloaded } = await run(
      (req) => [start, [moveSnapshot(req)]],
      (core) => core.cancel(),
    );

    expect(shown).toContain("other:incomplete");
    expect(rows.get("other"), writes.join(", ")).toEqual({
      id: "other",
      status: "incomplete",
      text: "o",
    });
    expect(writes.filter((write) => write === "append other")).toHaveLength(1);
    expect(writes.filter((write) => write.endsWith(" other"))).toHaveLength(1);
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("control: an older EOF finalizer does not write a newer run's answer", async () => {
    const writes: string[] = [];
    const history = createHistory(writes);
    let transportFinished!: () => void;
    const firstTransport = new Promise<void>((resolve) => {
      transportFinished = resolve;
    });
    let releaseFinalizer!: () => void;
    const firstFinalizer = new Promise<void>((resolve) => {
      releaseFinalizer = resolve;
    });
    let runs = 0;
    class DelayedAgent extends HttpAgent {
      override async runAgent(...args: Parameters<HttpAgent["runAgent"]>) {
        const first = runs++ === 0;
        const result = await super.runAgent(...args);
        if (first) {
          transportFinished();
          await firstFinalizer;
        }
        return result;
      }
    }
    let finishSecond!: () => void;
    let requests = 0;
    const agent = new DelayedAgent({
      url: "https://agent.test",
      fetch: async (_url: unknown, init: RequestInit) => {
        const requestMessages = JSON.parse(init.body as string).messages ?? [];
        const first = requests++ === 0;
        const events = first
          ? [...start, moveSnapshot(requestMessages)]
          : [
              { type: "RUN_STARTED", threadId: "t", runId: "r2" },
              {
                type: "TEXT_MESSAGE_START",
                messageId: "next-answer",
                role: "assistant",
              },
              {
                type: "TEXT_MESSAGE_CONTENT",
                messageId: "next-answer",
                delta: "a2",
              },
              {
                type: "MESSAGES_SNAPSHOT",
                messages: [
                  ...requestMessages,
                  { id: "next-answer", role: "assistant", content: "a2" },
                  { id: "newest", role: "assistant", content: "new answer" },
                ],
              },
            ];
        const encoder = new TextEncoder();
        const encoded = encoder.encode(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        );
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoded);
            if (first) controller.close();
            else
              finishSecond = () => {
                controller.enqueue(
                  encoder.encode(
                    [
                      { type: "TEXT_MESSAGE_END", messageId: "next-answer" },
                      { type: "RUN_FINISHED", threadId: "t", runId: "r2" },
                    ]
                      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
                      .join(""),
                  ),
                );
                controller.close();
              };
          },
        });
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
    const firstSending = core.append(userMessage);
    await firstTransport;
    const secondSending = core.append({ ...userMessage, parentId: "other" });
    await expect.poll(() => core.getMessages().at(-1)?.id).toBe("newest");
    expect(core.getMessages().at(-1)?.status?.type).toBe("complete");
    expect(history.rows().has("newest")).toBe(false);

    const writesBeforeFinalizer = [...writes];
    releaseFinalizer();
    await firstSending;
    expect(core.isRunning()).toBe(true);
    expect(writes).toEqual(writesBeforeFinalizer);
    expect(history.rows().has("newest")).toBe(false);

    finishSecond();
    await secondSending;
    await expect
      .poll(() => history.rows().get("newest"))
      .toEqual({
        id: "newest",
        status: "complete",
        text: "new answer",
      });
    expect(writes.filter((write) => write === "append other")).toHaveLength(1);
    expect(writes.filter((write) => write === "append newest")).toHaveLength(1);
    expect(writes.filter((write) => write.endsWith(" newest"))).toHaveLength(1);
    expect((await reload(history)).slice(-2)).toEqual([
      "next-answer:complete",
      "newest:complete",
    ]);
  });

  it("stores the new head after one head-move snapshot and RUN_ERROR", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [{ type: "RUN_ERROR", message: "boom" }],
    ]);
    // Which message takes the error depends on whether the run moved onto
    // "other"; either way history holds what the thread shows.
    const other = shown.find((entry) => entry.startsWith("other:"));
    expect(["other:incomplete", "other:complete"]).toContain(other);
    expect(`other:${rows.get("other")?.status}`, writes.join(", ")).toBe(other);
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("stores a snapshot-only answer that a second snapshot repeats", async () => {
    const snapshot = (req: any[]) => ({
      type: "MESSAGES_SNAPSHOT",
      messages: [...req, { id: "only", role: "assistant", content: "o" }],
    });
    const { rows, writes, shown, reloaded } = await run((req) => [
      [{ type: "RUN_STARTED", threadId: "t", runId: "r" }, snapshot(req)],
      [snapshot(req)],
      [{ type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("only")?.status, writes.join(", ")).toBe("complete");
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("stores an answer that arrives only in a snapshot", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
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
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("keeps the streamed answer as the head after a snapshot adds an earlier step", async () => {
    const { writes, shown, reloaded } = await run((req) => [
      start,
      [
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            ...req,
            { id: "step", role: "assistant", content: "s" },
            { id: "answer", role: "assistant", content: "a1" },
          ],
        },
      ],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(shown.slice(1)).toEqual(["step:complete", "answer:complete"]);
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("stores the new head when the moved-off answer settles after the move", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [{ type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a2" }],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(shown.slice(1)).toEqual(["answer:complete", "other:complete"]);
    expect(rows.get("answer"), writes.join(", ")).toMatchObject({
      status: "complete",
      text: "a1a2",
    });
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("control: a second snapshot after the head move stores the new head", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [moveSnapshot(req)],
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("other")?.status, JSON.stringify({ writes, shown })).toBe(
      "complete",
    );
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("stores the new head when the stream ends after the moved-off answer's frame closes", async () => {
    const { rows, writes, shown, reloaded } = await run((req) => [
      start,
      [moveSnapshot(req)],
      [end],
    ]);
    expect(shown.slice(1)).toEqual(["answer:complete", "other:incomplete"]);
    expect(rows.get("other")?.status, writes.join(", ")).toBe("incomplete");
    expect(reloaded.slice(1), writes.join(", ")).toEqual(shown.slice(1));
  });

  it("control: the streamed answer without a snapshot is stored", async () => {
    const { rows, shown, reloaded } = await run(() => [
      start,
      [end, { type: "RUN_FINISHED", threadId: "t", runId: "r" }],
    ]);
    expect(rows.get("answer")?.status).toBe("complete");
    expect(reloaded).toEqual(shown);
  });
});
