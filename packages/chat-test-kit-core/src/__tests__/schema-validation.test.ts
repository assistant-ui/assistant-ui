import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";
import { transcriptSchema } from "../transcript/schema";

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validate = ajv.compile(transcriptSchema);

describe("transcript schema", () => {
  it("validates an empty transcript", () => {
    expect(validate(transcript().toJSON())).toBe(true);
  });

  it("validates a full-grammar transcript", () => {
    const t = transcript()
      .user("Check AAPL")
      .assistantToolCall("get_stock_price", { ticker: "AAPL" })
      .toolResult({ price: 212.44 })
      .assistantStream("AAPL is at $212.44.", {
        chunks: ["AAPL is ", "at $212.44."],
        interChunkDelayMs: 20,
        finish: { reason: "stop" },
      })
      .inject.disconnect({ afterChunk: 1 })
      .metadata({ runId: "r" })
      .delayMs(100)
      .toJSON();

    expect(validate(t)).toBe(true);
  });

  it("rejects an unknown turn kind", () => {
    expect(
      validate({ version: "0", turns: [{ kind: "unknown" }], injections: [] }),
    ).toBe(false);
  });

  it("rejects version other than '0'", () => {
    expect(validate({ version: "1", turns: [], injections: [] })).toBe(false);
  });

  it("rejects disconnect injection without afterChunk", () => {
    expect(
      validate({
        version: "0",
        turns: [{ kind: "assistantStream", text: "x", chunks: ["x"] }],
        injections: [{ kind: "disconnect", at: { turnIndex: 0 } }],
      }),
    ).toBe(false);
  });
});
