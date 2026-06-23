import { describe, expect, it } from "vitest";
import type { LangChainBaseMessage } from "./types";
import { langChainStreamingTimingAccessors } from "./streamingTiming";

const ai = (
  fields: Partial<LangChainBaseMessage> & { id: string; content: unknown },
): LangChainBaseMessage => ({
  _getType: () => "ai",
  ...fields,
});

const human = (id: string, content: unknown): LangChainBaseMessage => ({
  _getType: () => "human",
  id,
  content,
});

const { getAssistantMessageId, getTextLength, getToolCallCount } =
  langChainStreamingTimingAccessors;

describe("langChainStreamingTimingAccessors", () => {
  it("resolves the last assistant message id via _getType()", () => {
    expect(
      getAssistantMessageId([human("u1", "hi"), ai({ id: "a1", content: "" })]),
    ).toBe("a1");
    expect(
      getAssistantMessageId([
        ai({ id: "a1", content: "" }),
        human("u2", "hi"),
        ai({ id: "a2", content: "" }),
      ]),
    ).toBe("a2");
  });

  it("returns undefined when there is no assistant message", () => {
    expect(getAssistantMessageId([human("u1", "hi")])).toBeUndefined();
  });

  it("measures string content length", () => {
    expect(getTextLength([ai({ id: "a1", content: "hello" })], "a1")).toBe(5);
  });

  it("sums text and thinking lengths across content blocks", () => {
    expect(
      getTextLength(
        [
          ai({
            id: "a1",
            content: [
              { type: "thinking", thinking: "hmm" },
              { type: "text", text: "answer" },
            ],
          }),
        ],
        "a1",
      ),
    ).toBe("hmm".length + "answer".length);
  });

  it("measures reasoning blocks (summary and reasoning fields)", () => {
    // reasoning via summary_text entries, joined like contentToParts does.
    expect(
      getTextLength(
        [
          ai({
            id: "a1",
            content: [
              {
                type: "reasoning",
                summary: [
                  { type: "summary_text", text: "step one" },
                  { type: "summary_text", text: "step two" },
                ],
              },
            ],
          }),
        ],
        "a1",
      ),
    ).toBe("step one\n\n\nstep two".length);

    // reasoning via the bare `reasoning` field when no summary is present.
    expect(
      getTextLength(
        [
          ai({
            id: "a2",
            content: [{ type: "reasoning", reasoning: "deduced" }],
          }),
        ],
        "a2",
      ),
    ).toBe("deduced".length);
  });

  it("counts tool_calls on the assistant message", () => {
    expect(
      getToolCallCount(
        [
          ai({
            id: "a1",
            content: "",
            tool_calls: [
              { id: "t1", name: "search", args: {} },
              { id: "t2", name: "fetch", args: {} },
            ],
          }),
        ],
        "a1",
      ),
    ).toBe(2);
  });

  it("returns 0 when the message is missing or not assistant", () => {
    expect(getTextLength([human("u1", "hi")], "a1")).toBe(0);
    expect(getToolCallCount([human("u1", "hi")], "a1")).toBe(0);
  });
});
