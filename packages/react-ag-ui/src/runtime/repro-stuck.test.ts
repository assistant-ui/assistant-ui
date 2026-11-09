import { describe, expect, it } from "vitest";
import { HttpAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ExportedMessageRepositoryItem,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

const userMessage: AppendMessage = {
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  startRun: true,
};

const hangingAgent = () =>
  new HttpAgent({
    url: "https://example.invalid",
    fetch: async () => {
      const enc = new TextEncoder();
      const body = new ReadableStream({
        start(c) {
          for (const e of [
            { type: "RUN_STARTED", threadId: "t", runId: "r" },
            { type: "TEXT_MESSAGE_START", messageId: "a", role: "assistant" },
            { type: "TEXT_MESSAGE_CONTENT", messageId: "a", delta: "plan..." },
          ])
            c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        },
      });
      return new Response(body, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  });

const storage = () => {
  const items: ExportedMessageRepositoryItem[] = [];
  const history: ThreadHistoryAdapter = {
    load: async () => ({ messages: [...items] }),
    append: async (item) => {
      items.push(item);
    },
    update: async (item) => {
      const i = items.findIndex((x) => x.message.id === item.message.id);
      if (i >= 0) items[i] = item;
      else items.push(item);
    },
  };
  return { items, history };
};

describe("repro", () => {
  it("history adapter path", async () => {
    const { items, history } = storage();
    const c1 = new AgUiThreadController({
      agent: hangingAgent(),
      logger: makeLogger(),
      showThinking: false,
      history,
    });
    await c1.__internal_load();
    void c1.append(userMessage);
    await new Promise((r) => setTimeout(r, 50));
    console.log(
      "live",
      c1.isRunning(),
      c1.getMessages().map((m) => [m.role, (m as any).status]),
    );
    console.log(
      "stored",
      JSON.stringify(
        items.map((i) => [i.message.role, (i.message as any).status]),
      ),
    );
    const exported = c1.getMessageRepository();
    console.log(
      "export",
      JSON.stringify(
        exported.messages.map((i) => [
          i.message.role,
          (i.message as any).status,
        ]),
      ),
    );

    const c2 = new AgUiThreadController({
      agent: hangingAgent(),
      logger: makeLogger(),
      showThinking: false,
      history,
    });
    await c2.__internal_load();
    console.log(
      "reloaded",
      c2.isRunning(),
      JSON.stringify(c2.getMessages().map((m) => [m.role, (m as any).status])),
    );

    const c3 = new AgUiThreadController({
      agent: hangingAgent(),
      logger: makeLogger(),
      showThinking: false,
    });
    c3.applyExternalMessages(exported.messages.map((i) => i.message));
    console.log(
      "imported",
      c3.isRunning(),
      JSON.stringify(c3.getMessages().map((m) => [m.role, (m as any).status])),
    );
    expect(true).toBe(true);
  });
});
