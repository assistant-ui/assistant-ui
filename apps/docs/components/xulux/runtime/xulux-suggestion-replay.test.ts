import { convertToModelMessages, pruneMessages, readUIMessageStream } from "ai";
import { describe, expect, it } from "vitest";
import {
  createXuluxSuggestionReplayChunks,
  createXuluxSuggestionReplayResponse,
  splitReplayText,
} from "./xulux-suggestion-replay";

describe("xulux suggestion replay", () => {
  it("splits text into multiple lossless chunks", () => {
    const text = "one two three four five six seven eight nine";
    const chunks = splitReplayText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(text);
  });

  it("creates a standard text stream", () => {
    const chunks = createXuluxSuggestionReplayChunks("learn-thread-component");
    expect(chunks?.at(0)).toEqual({ type: "start" });
    expect(chunks?.some((chunk) => chunk.type === "text-start")).toBe(true);
    expect(
      chunks?.filter((chunk) => chunk.type === "text-delta").length,
    ).toBeGreaterThan(1);
    expect(chunks?.at(-1)).toEqual({
      type: "finish",
      finishReason: "stop",
    });
  });

  it("includes the preview tool result for template suggestions", () => {
    const chunks = createXuluxSuggestionReplayChunks("template-chatgpt");
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-input-available",
        toolName: "openTemplatePreview",
      }),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        output: expect.objectContaining({
          success: true,
          templateId: "chatgpt",
          previewUrl: "/demos/chatgpt",
        }),
      }),
    );
  });

  it("creates a fresh preview tool call for every replay", () => {
    const first = createXuluxSuggestionReplayChunks("new-app-product-docs");
    const second = createXuluxSuggestionReplayChunks("new-app-product-docs");
    const firstTool = first?.find(
      (chunk) => chunk.type === "tool-input-available",
    );
    const secondTool = second?.find(
      (chunk) => chunk.type === "tool-input-available",
    );

    expect(firstTool?.toolCallId).toMatch(/^preview-new-app-product-docs-/);
    expect(secondTool?.toolCallId).toMatch(/^preview-new-app-product-docs-/);
    expect(firstTool?.toolCallId).not.toBe(secondTool?.toolCallId);
  });

  it("puts preview tools in an earlier step that follow-up pruning removes", async () => {
    const chunks = createXuluxSuggestionReplayChunks("template-chatgpt") ?? [];
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });

    let replayedMessage;
    for await (const message of readUIMessageStream({ stream })) {
      replayedMessage = message;
    }

    expect(replayedMessage).toBeDefined();
    const modelMessages = await convertToModelMessages([
      replayedMessage!,
      {
        role: "user",
        parts: [{ type: "text", text: "follow up" }],
      },
    ]);
    expect(modelMessages.map((message) => message.role)).toEqual([
      "assistant",
      "tool",
      "assistant",
      "user",
    ]);

    const pruned = pruneMessages({
      messages: modelMessages,
      toolCalls: "before-last-2-messages",
      emptyMessages: "remove",
    });
    expect(pruned.map((message) => message.role)).toEqual([
      "assistant",
      "user",
    ]);
    expect(JSON.stringify(pruned)).not.toContain("openTemplatePreview");
  });

  it("returns null for an unknown replay", () => {
    expect(createXuluxSuggestionReplayChunks("unknown")).toBeNull();
    expect(createXuluxSuggestionReplayResponse("unknown")).toBeNull();
  });

  it("returns an SSE response with delays disabled", async () => {
    const response = createXuluxSuggestionReplayResponse(
      "learn-thread-component",
      { initialDelayInMs: null, chunkDelayInMs: null },
    );
    expect(response?.headers.get("content-type")).toContain(
      "text/event-stream",
    );
    const body = await response?.text();
    expect(body).toContain('"type":"text-delta"');
    expect(body).toContain('"type":"finish"');
  });
});
