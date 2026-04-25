import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";

describe("transcript().assistantStream()", () => {
  it("text-only defaults to a single chunk equal to text", () => {
    expect(
      transcript().assistantStream("hello world").toJSON().turns[0],
    ).toEqual({
      kind: "assistantStream",
      text: "hello world",
      chunks: ["hello world"],
    });
  });

  it("explicit chunks must concatenate to text", () => {
    expect(() =>
      transcript().assistantStream("hello world", {
        chunks: ["hel", "lo"],
      }),
    ).toThrow(/chunks.*concatenate/i);
  });

  it("interChunkDelayMs is preserved", () => {
    const turn = transcript()
      .assistantStream("hi", { chunks: ["h", "i"], interChunkDelayMs: 25 })
      .toJSON().turns[0];
    expect(turn).toMatchObject({ interChunkDelayMs: 25 });
  });

  it("finish defaults to undefined; explicit finish is preserved", () => {
    const turn = transcript()
      .assistantStream("hi", { finish: { reason: "stop" } })
      .toJSON().turns[0];
    expect(turn).toMatchObject({ finish: { reason: "stop" } });
  });
});
