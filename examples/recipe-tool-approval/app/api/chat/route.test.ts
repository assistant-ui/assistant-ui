import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { models } = vi.hoisted(() => ({ models: [] as unknown[] }));

vi.mock("@ai-sdk/openai", async (importOriginal) => ({
  ...(await importOriginal()),
  openai: () => models.shift(),
}));

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const finish = (unified: "stop" | "tool-calls") => ({
  type: "finish" as const,
  finishReason: { unified, raw: undefined },
  usage,
});

const refundCall = () =>
  simulateReadableStream({
    chunks: [
      {
        type: "tool-call" as const,
        toolCallId: "call_1",
        toolName: "refundOrder",
        input: JSON.stringify({ orderId: "A-1001", reason: "arrived broken" }),
      },
      finish("tool-calls"),
    ],
  });

const textAnswer = () =>
  simulateReadableStream({
    chunks: [
      { type: "text-start" as const, id: "t" },
      { type: "text-delta" as const, id: "t", delta: "Done." },
      { type: "text-end" as const, id: "t" },
      finish("stop"),
    ],
  });

// Scripted model: it calls `refundOrder` first and answers in text once a tool result is in the prompt.
const scriptedModel = () =>
  new MockLanguageModelV4({
    doStream: async ({ prompt }) => ({
      stream: prompt.some((message) => message.role === "tool")
        ? textAnswer()
        : refundCall(),
    }),
  });

const userMessage: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "Refund order A-1001, it arrived broken." }],
};

async function chat(messages: UIMessage[], continued?: UIMessage) {
  models.push(scriptedModel());
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
      body: JSON.stringify({ messages }),
    }),
  );
  const chunks = parseJsonEventStream({
    stream: response.body!,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(result, controller) {
        if (!result.success) throw result.error;
        controller.enqueue(result.value as UIMessageChunk);
      },
    }),
  );
  let message: UIMessage | undefined;
  for await (const snapshot of readUIMessageStream({
    stream: chunks,
    terminateOnError: true,
    ...(continued && { message: continued }),
  })) {
    message = snapshot;
  }
  return message!;
}

const refundPart = (message: UIMessage) => {
  const part = message.parts.find((p) => p.type === "tool-refundOrder");
  if (part?.type !== "tool-refundOrder") throw new Error("no refund call");
  return part as Extract<typeof part, { state: string }>;
};

async function answerApproval(
  approved: boolean,
  input?: { orderId: string; reason: string },
) {
  const first = await chat([userMessage]);
  const request = refundPart(first);
  if (request.state !== "approval-requested") throw new Error(request.state);
  const assistant: UIMessage = {
    ...first,
    parts: first.parts.map((part) =>
      part === request
        ? {
            ...request,
            input: input ?? request.input,
            state: "approval-responded",
            approval: { ...request.approval, approved },
          }
        : part,
    ),
  };
  return chat([userMessage, assistant], assistant);
}

beforeEach(() => {
  models.length = 0;
  process.env.TOOL_APPROVAL_SECRET = "test-secret";
});

describe("tool approval recipe", () => {
  it("pauses the refund for approval instead of running it", async () => {
    const message = await chat([userMessage]);

    const part = refundPart(message);
    expect(part.state).toBe("approval-requested");
    expect(part.input).toEqual({ orderId: "A-1001", reason: "arrived broken" });
  });

  it("runs the refund once the user approves", async () => {
    const message = await answerApproval(true);

    const part = refundPart(message);
    expect(part.state).toBe("output-available");
    expect(part.output).toEqual({ refunded: 199, orderId: "A-1001" });
  });

  it("skips the refund when the user denies it", async () => {
    const message = await answerApproval(false);

    expect(refundPart(message).state).toBe("output-denied");
  });

  it("refuses an approval whose call was changed after signing", async () => {
    await expect(
      answerApproval(true, { orderId: "A-1002", reason: "arrived broken" }),
    ).rejects.toThrow();
  });

  it("refuses cross-origin requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ messages: [userMessage] }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
