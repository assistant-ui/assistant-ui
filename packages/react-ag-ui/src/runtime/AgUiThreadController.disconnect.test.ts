import { describe, expect, it } from "vitest";
import { HttpAgent } from "@ag-ui/client";
import type { AppendMessage } from "@assistant-ui/core";
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

function createController(events: object[]) {
  const agent = new HttpAgent({
    url: "https://example.invalid",
    fetch: async () =>
      new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  return new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
  });
}

const start = { type: "RUN_STARTED", threadId: "thread", runId: "run" };
const text = [
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "answer",
    delta: "partial answer",
  },
];

describe("AgUiThreadController HTTP stream closure", () => {
  it.each([false, true])(
    "settles a partial answer when EOF arrives without RUN_FINISHED (text ended: %s)",
    async (textEnded) => {
      const events = [
        start,
        ...text,
        ...(textEnded
          ? [{ type: "TEXT_MESSAGE_END", messageId: "answer" }]
          : []),
      ];
      const core = createController(events);

      await core.append(userMessage);

      expect(core.isRunning()).toBe(false);
      expect(core.getMessages().at(-1)).toMatchObject({
        id: "answer",
        content: [{ type: "text", text: "partial answer" }],
        status: { type: "incomplete", reason: "error" },
      });

      events.splice(
        0,
        events.length,
        start,
        { type: "TEXT_MESSAGE_START", messageId: "next", role: "assistant" },
        {
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "next",
          delta: "next answer",
        },
        { type: "TEXT_MESSAGE_END", messageId: "next" },
        {
          type: "RUN_FINISHED",
          threadId: "thread",
          runId: "run",
        },
      );
      await core.append({
        ...userMessage,
        parentId: core.getMessages().at(-1)!.id,
      });
      expect(core.isRunning()).toBe(false);
      expect(core.getMessages().at(-1)?.status?.type).toBe("complete");
    },
  );

  it("preserves snapshot content when the stream closes without a terminal event", async () => {
    const core = createController([
      start,
      ...text,
      {
        type: "MESSAGES_SNAPSHOT",
        messages: [
          { id: "answer", role: "assistant", content: "snapshot answer" },
        ],
      },
    ]);

    await core.append(userMessage);

    expect(core.isRunning()).toBe(false);
    expect(core.getMessages().at(-1)).toMatchObject({
      id: "answer",
      content: [{ type: "text", text: "snapshot answer" }],
    });
    expect(core.getMessages().at(-1)?.status?.type).not.toBe("running");
  });
});
