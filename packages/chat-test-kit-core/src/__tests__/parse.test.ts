import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";
import { Transcript } from "../transcript/parse";

describe("Transcript.fromJSON", () => {
  it("accepts a builder-produced transcript and returns it as-is shape", () => {
    const built = transcript().user("hi").toJSON();
    expect(Transcript.fromJSON(built)).toEqual(built);
  });

  it("rejects a malformed transcript with a descriptive error", () => {
    expect(() =>
      Transcript.fromJSON({ version: "9", turns: [], injections: [] }),
    ).toThrow(/version/i);
  });

  it("rejects a non-object input", () => {
    expect(() => Transcript.fromJSON(null)).toThrow();
    expect(() => Transcript.fromJSON("x")).toThrow();
  });

  it("rejects mismatched chunks vs text", () => {
    expect(() =>
      Transcript.fromJSON({
        version: "0",
        turns: [
          { kind: "assistantStream", text: "hello", chunks: ["he", "X"] },
        ],
        injections: [],
      }),
    ).toThrow(/chunks.*concatenate/i);
  });

  it("rejects toolResult that does not match an open tool call", () => {
    expect(() =>
      Transcript.fromJSON({
        version: "0",
        turns: [{ kind: "toolResult", toolCallId: "tc_missing", value: 1 }],
        injections: [],
      }),
    ).toThrow(/toolResult.*tc_missing/i);
  });

  it("rejects disconnect injection whose target is not an assistantStream", () => {
    expect(() =>
      Transcript.fromJSON({
        version: "0",
        turns: [{ kind: "user", content: [] }],
        injections: [
          { kind: "disconnect", at: { turnIndex: 0, afterChunk: 0 } },
        ],
      }),
    ).toThrow(/disconnect.*assistantStream/i);
  });
});
