import { describe, expect, it } from "vitest";
import { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { createAssistantStream } from "../modules/assistant-stream";
import { PlainTextEncoder } from "./PlainText";

describe("PlainTextEncoder", () => {
  it("emits only the assistant text for a reasoning + tool-call + text stream", async () => {
    const stream = createAssistantStream(async (controller) => {
      controller.appendReasoning("internal chain of thought. ");
      const tool = controller.addToolCallPart({
        toolCallId: "call_1",
        toolName: "search",
      });
      tool.argsText.append('{"query":"secret"}');
      tool.setResponse({ result: "ok" });
      tool.close();
      controller.appendText("Hello!");
    });

    const response = AssistantStream.toResponse(stream, new PlainTextEncoder());
    await expect(response.text()).resolves.toBe("Hello!");
  });

  it("skips annotations, data, and update-state chunks without throwing", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "part-start", path: [], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "Hi" },
      { type: "annotations", path: [], annotations: [{ note: "cited" }] },
      { type: "data", path: [], data: [{ progress: 1 }] },
      {
        type: "update-state",
        path: [],
        operations: [{ type: "set", path: ["k"], value: "v" }],
      },
      { type: "part-finish", path: [0] },
    ];
    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });

    const response = AssistantStream.toResponse(stream, new PlainTextEncoder());
    await expect(response.text()).resolves.toBe("Hi");
  });

  it("sends plain text headers without the data-stream protocol marker", () => {
    const headers = new PlainTextEncoder().headers;
    expect(headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(headers.has("x-vercel-ai-data-stream")).toBe(false);
  });
});
