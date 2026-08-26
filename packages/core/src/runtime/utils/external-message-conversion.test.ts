import { describe, expect, it } from "vitest";
import {
  chunkExternalMessages,
  convertExternalMessageCallback,
  convertExternalMessageChunk,
  type ExternalMessageConverterCallback,
  type ExternalMessageConverterCallbackResult,
} from "./external-message-conversion";

describe("convertExternalMessageCallback", () => {
  it("rejects a tool message without a string toolCallId", () => {
    const input = { id: "m1" };
    const callback = (() => ({
      role: "tool",
      result: "ok",
    })) as unknown as ExternalMessageConverterCallback<typeof input>;

    expect(() =>
      convertExternalMessageCallback(input, callback, {}),
    ).toThrowError(
      /returned an invalid message \(\{"role":"tool","result":"ok"\}\) for input \{"id":"m1"\}/,
    );
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
});
