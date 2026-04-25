import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";
import { Transcript } from "../transcript/parse";

describe("DSL to JSON to fromJSON round trip", () => {
  it("preserves a complex transcript exactly", () => {
    const original = transcript()
      .user("Check AAPL")
      .assistantToolCall("get_stock_price", { ticker: "AAPL" })
      .toolResult({ price: 212.44 })
      .assistantStream("AAPL is at $212.44.", {
        chunks: ["AAPL is ", "at $212.44."],
        interChunkDelayMs: 20,
        finish: { reason: "stop" },
      })
      .inject.disconnect({ afterChunk: 1 })
      .metadata({ runId: "r1" })
      .delayMs(50)
      .inject.transportError({ code: 500, message: "boom" })
      .toJSON();

    const reparsed = Transcript.fromJSON(JSON.parse(JSON.stringify(original)));
    expect(reparsed).toEqual(original);
  });
});
