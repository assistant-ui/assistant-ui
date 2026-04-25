import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";

describe("transcript().metadata() / delayMs()", () => {
  it("metadata appends a metadata turn", () => {
    expect(transcript().metadata({ runId: "r1" }).toJSON().turns[0]).toEqual({
      kind: "metadata",
      data: { runId: "r1" },
    });
  });

  it("delayMs appends a delay turn", () => {
    expect(transcript().delayMs(50).toJSON().turns[0]).toEqual({
      kind: "delay",
      ms: 50,
    });
  });

  it("delayMs rejects negative values", () => {
    expect(() => transcript().delayMs(-1)).toThrow(/non-negative/i);
  });

  it("metadata is callable from any ready state and chains as Ready", () => {
    const t = transcript()
      .user("hi")
      .metadata({ tag: "before-stream" })
      .assistantStream("hello")
      .metadata({ tag: "after-stream" })
      .toJSON();
    expect(t.turns.map((turn) => turn.kind)).toEqual([
      "user",
      "metadata",
      "assistantStream",
      "metadata",
    ]);
  });
});
