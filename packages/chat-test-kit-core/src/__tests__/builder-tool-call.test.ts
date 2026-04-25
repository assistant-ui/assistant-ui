import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";

describe("transcript().assistantToolCall() / toolResult()", () => {
  it("auto-generates a toolCallId and serializes args to argsText", () => {
    const t = transcript()
      .assistantToolCall("get_stock_price", { ticker: "AAPL" })
      .toolResult({ price: 212.44 })
      .toJSON();

    expect(t.turns).toHaveLength(2);
    expect(t.turns[0]).toMatchObject({
      kind: "assistantToolCall",
      toolCallId: "tc_1",
      name: "get_stock_price",
      args: { ticker: "AAPL" },
      argsText: '{"ticker":"AAPL"}',
    });
    expect(t.turns[1]).toEqual({
      kind: "toolResult",
      toolCallId: "tc_1",
      value: { price: 212.44 },
    });
  });

  it("explicit toolCallId is honored", () => {
    const t = transcript()
      .assistantToolCall("x", {}, { toolCallId: "tc_custom" })
      .toolResult(1)
      .toJSON();
    expect(t.turns[0]).toMatchObject({ toolCallId: "tc_custom" });
    expect(t.turns[1]).toMatchObject({ toolCallId: "tc_custom" });
  });

  it("toolResult is not callable on a Ready builder", () => {
    const ready = transcript();
    expect(() => {
      // @ts-expect-error toolResult only exists after assistantToolCall.
      ready.toolResult(1);
    }).toThrow(/assistantToolCall/);
    expect(() =>
      (
        transcript() as unknown as { toolResult: (v: unknown) => unknown }
      ).toolResult(1),
    ).toThrow(/assistantToolCall/);
  });

  it("two consecutive tool calls chain through toolResult", () => {
    const t = transcript()
      .assistantToolCall("a", {})
      .toolResult(1)
      .assistantToolCall("b", {})
      .toolResult(2)
      .toJSON();
    expect(t.turns).toHaveLength(4);
  });
});
