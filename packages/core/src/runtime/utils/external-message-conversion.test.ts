import { describe, expect, it, vi } from "vitest";
import {
  chunkExternalMessages,
  convertExternalMessageCallback,
  convertExternalMessageChunk,
  type ExternalMessageConverterCallback,
  type ExternalMessageConverterCallbackResult,
} from "./external-message-conversion";

describe("convertExternalMessageCallback", () => {
  it.each([
    ["a missing toolCallId", { role: "tool", result: "ok" }],
    ["an empty toolCallId", { role: "tool", toolCallId: "", result: "ok" }],
  ])("warns and drops a tool message with %s", (_label, message) => {
    const input = { id: "m1" };
    const callback = (() =>
      message) as unknown as ExternalMessageConverterCallback<typeof input>;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = convertExternalMessageCallback(input, callback, {});
      expect(result.outputs).toHaveLength(0);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]![0]).toMatch(
        /dropping a tool result without a toolCallId/,
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("chunkExternalMessages", () => {
  it("keeps a tool result with a non-joining assistant before starting the next chunk", () => {
    const toolCall = {};
    const toolResult = {};
    const answer = {};
    const callbackResults: ExternalMessageConverterCallbackResult<object>[] = [
      {
        input: toolCall,
        outputs: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "search",
                args: {},
              },
            ],
            convertConfig: { joinStrategy: "none" },
          },
        ],
      },
      {
        input: toolResult,
        outputs: [
          {
            role: "tool",
            toolCallId: "call-1",
            toolName: "search",
            result: "result",
          },
        ],
      },
      {
        input: answer,
        outputs: [{ role: "assistant", content: "answer" }],
      },
    ];

    const chunks = chunkExternalMessages(callbackResults);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.inputs).toEqual([toolCall, toolResult]);
    expect(chunks[0]?.outputs).toEqual([
      callbackResults[0]?.outputs[0],
      callbackResults[1]?.outputs[0],
    ]);
    expect(chunks[1]?.inputs).toEqual([answer]);
  });
});

describe("convertExternalMessageChunk", () => {
  it("keeps separate tool calls without IDs", () => {
    const result = convertExternalMessageChunk(
      {
        inputs: [{}],
        outputs: [
          {
            role: "assistant",
            content: [
              { type: "tool-call", toolName: "weather", args: {} },
              { type: "tool-call", toolName: "search", args: {} },
            ],
          },
        ],
      },
      0,
      1,
      false,
      undefined,
    );

    expect(result.content).toMatchObject([
      { type: "tool-call", toolName: "weather" },
      { type: "tool-call", toolName: "search" },
    ]);
    const calls = result.content.filter((part) => part.type === "tool-call");
    expect(calls[0]!.toolCallId).not.toBe(calls[1]!.toolCallId);
    expect(calls.map((call) => call.toolCallId)).not.toContain("");
  });

  it("keeps separate tool calls with empty IDs", () => {
    const result = convertExternalMessageChunk(
      {
        inputs: [{}],
        outputs: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "",
                toolName: "weather",
                args: {},
              },
              {
                type: "tool-call",
                toolCallId: "",
                toolName: "search",
                args: {},
              },
            ],
          },
        ],
      },
      0,
      1,
      false,
      undefined,
    );

    expect(result.content).toMatchObject([
      { type: "tool-call", toolName: "weather" },
      { type: "tool-call", toolName: "search" },
    ]);
    const calls = result.content.filter((part) => part.type === "tool-call");
    expect(calls[0]?.toolCallId).not.toBe(calls[1]?.toolCallId);
    expect(calls.map((call) => call.toolCallId)).not.toContain("");
  });

  it("reuses a cached message when the error status is unchanged", () => {
    const input = {};
    const chunk = {
      inputs: [input],
      outputs: [{ role: "assistant" as const, content: "failed" }],
    };
    const generatedFallbackMessages = new WeakSet<object>();
    const first = convertExternalMessageChunk(
      chunk,
      0,
      1,
      false,
      { message: "failed" },
      { message: undefined, generatedFallbackMessages },
    );

    const second = convertExternalMessageChunk(
      chunk,
      0,
      1,
      true,
      { message: "failed" },
      { message: first, generatedFallbackMessages },
    );

    expect(second).toBe(first);
  });

  it("replaces a cached complete status after cancellation", () => {
    const input = {};
    const chunk = {
      inputs: [input],
      outputs: [{ id: "m1", role: "assistant" as const, content: "partial" }],
    };
    const cancelled = new Set(["m1"]);
    const generatedFallbackMessages = new WeakSet<object>();
    const first = convertExternalMessageChunk(chunk, 0, 1, false, undefined, {
      message: undefined,
      generatedFallbackMessages,
    });

    const second = convertExternalMessageChunk(
      chunk,
      0,
      1,
      false,
      undefined,
      { message: first, generatedFallbackMessages },
      cancelled,
    );

    expect(first.status).toMatchObject({ type: "complete", reason: "unknown" });
    expect(second).not.toBe(first);
    expect(second.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });

    const failed = convertExternalMessageChunk(
      chunk,
      0,
      1,
      false,
      "failed",
      { message: second, generatedFallbackMessages },
      cancelled,
    );
    expect(failed.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "failed",
    });
  });

  it("cancels a joined chunk when any joined message was stopped", () => {
    const generatedFallbackMessages = new WeakSet<object>();
    const result = convertExternalMessageChunk(
      {
        inputs: [{}, {}],
        outputs: [
          { id: "m1", role: "assistant" as const, content: "first" },
          { id: "m2", role: "assistant" as const, content: "second" },
        ],
      },
      0,
      1,
      false,
      undefined,
      { message: undefined, generatedFallbackMessages },
      new Set(["m2"]),
    );

    expect(result.status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("cancels an earlier message that is no longer the last one", () => {
    const cancelled = new Set(["m1"]);
    const generatedFallbackMessages = new WeakSet<object>();
    const build = (id: string, idx: number) =>
      convertExternalMessageChunk(
        {
          inputs: [{}],
          outputs: [{ id, role: "assistant" as const, content: "text" }],
        },
        idx,
        2,
        false,
        undefined,
        { message: undefined, generatedFallbackMessages },
        cancelled,
      );

    expect(build("m1", 0).status).toMatchObject({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(build("m2", 1).status).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
  });
});
