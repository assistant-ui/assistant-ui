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

type End = "close" | "error" | "stop" | "finish";

async function run(end: End, withSnapshot = true) {
  let write!: (e: object) => void;
  let close!: () => void;
  let requestMessages: any[] = [];
  const agent = new HttpAgent({
    url: "https://agent.test",
    fetch: async (_url: unknown, init: RequestInit) => {
      const encoder = new TextEncoder();
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      let closed = false;
      const body = new ReadableStream<Uint8Array>({
        start: (c) => void (controller = c),
      });
      requestMessages = JSON.parse(init.body as string).messages ?? [];
      write = (e) => {
        if (!closed)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      init.signal?.addEventListener("abort", () => {
        if (closed) return;
        closed = true;
        try {
          controller.error(new DOMException("aborted", "AbortError"));
        } catch {}
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
  });
  const sending = core.append(userMessage).catch(() => {});
  for (let i = 0; i < 50 && !write; i++) await tick();
  const events: object[] = [
    { type: "RUN_STARTED", threadId: "t", runId: "r" },
    { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "a1" },
    { type: "TEXT_MESSAGE_END", messageId: "answer" },
    { type: "TOOL_CALL_START", toolCallId: "task", toolCallName: "task" },
    { type: "TOOL_CALL_END", toolCallId: "task" },
    {
      type: "SUBAGENT_STARTED",
      subagentRunId: "sub",
      name: "worker",
      parentToolCallId: "task",
    },
    {
      type: "TOOL_CALL_START",
      toolCallId: "ncall",
      toolCallName: "search",
      subagentRunId: "sub",
    },
    { type: "TOOL_CALL_END", toolCallId: "ncall", subagentRunId: "sub" },
    { type: "SUBAGENT_FINISHED", subagentRunId: "sub" },
  ];
  for (const e of events) write(e);
  await settle();
  if (withSnapshot) {
    write({
      type: "MESSAGES_SNAPSHOT",
      messages: [
        ...requestMessages,
        {
          id: "answer",
          role: "assistant",
          content: "a1",
          toolCalls: [
            {
              id: "task",
              type: "function",
              function: { name: "task", arguments: "{}" },
            },
          ],
        },
        {
          id: "s-call",
          role: "assistant",
          content: "",
          subagentRunId: "sub",
          toolCalls: [
            {
              id: "ncall",
              type: "function",
              function: { name: "search", arguments: "{}" },
            },
          ],
        },
      ],
    });
    await settle();
  }
  const before = nested(core);
  if (end === "close") close();
  else if (end === "error")
    write({ type: "RUN_ERROR", message: "server failed" });
  else if (end === "finish")
    write({ type: "RUN_FINISHED", threadId: "t", runId: "r" });
  else await core.cancel();
  await settle();
  close();
  await sending;
  await settle();
  return { before, after: nested(core) };
}

function nested(core: AgUiThreadController) {
  const answer = core.getMessages().find((m: any) => m.id === "answer") as any;
  const call = answer?.content.find(
    (p: any) => p.type === "tool-call" && p.toolCallId === "task",
  );
  const sub = call?.messages?.find((m: any) => m.id === "sub");
  return {
    answer: answer?.status?.type,
    sub: sub?.status?.type,
    subReason: sub?.status?.reason,
    ncallOpen: sub?.content.some(
      (p: any) => p.toolCallId === "ncall" && p.result === undefined,
    ),
  };
}

describe("ag-ui: a nested message waiting on its own call after the run ends", () => {
  for (const end of ["close", "error", "stop"] as const) {
    it(`settles the nested message when the run ends by ${end}`, async () => {
      const { before, after } = await run(end);
      // the snapshot imported the sub-agent's message waiting on ncall
      expect(before.sub, JSON.stringify(before)).toBe("requires-action");
      expect(after.answer, JSON.stringify(after)).toBe("incomplete");
      expect(after.sub, JSON.stringify(after)).not.toBe("requires-action");
    });
  }

  it("control: after RUN_FINISHED the nested call stays open and is not settled as an error", async () => {
    const { after } = await run("finish");
    expect(after.answer, JSON.stringify(after)).toBe("requires-action");
    expect(after.ncallOpen, JSON.stringify(after)).toBe(true);
    expect(after.subReason, JSON.stringify(after)).not.toBe("error");
  });

  it("control: without the snapshot the nested message is the stream's (complete) and settles", async () => {
    const { before, after } = await run("close", false);
    expect(before.sub, JSON.stringify(before)).toBe("complete");
    expect(after.sub, JSON.stringify(after)).not.toBe("requires-action");
  });
});
