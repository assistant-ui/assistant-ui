import { describe, expect, it } from "vitest";
import {
  chunkExternalMessages,
  type ExternalMessageConverterCallbackResult,
} from "./external-message-conversion";

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
