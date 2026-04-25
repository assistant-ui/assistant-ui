import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";

describe("transcript().user()", () => {
  it("string content becomes a single text part", () => {
    expect(transcript().user("hello").toJSON()).toEqual({
      version: "0",
      turns: [{ kind: "user", content: [{ type: "text", text: "hello" }] }],
      injections: [],
    });
  });

  it("array content is preserved as-is", () => {
    const t = transcript()
      .user([
        { type: "text", text: "see file" },
        { type: "text", text: "now" },
      ])
      .toJSON();

    expect(t.turns[0]).toEqual({
      kind: "user",
      content: [
        { type: "text", text: "see file" },
        { type: "text", text: "now" },
      ],
    });
  });

  it("multiple user turns chain", () => {
    expect(transcript().user("a").user("b").toJSON().turns).toHaveLength(2);
  });

  it("returned JSON is a fresh object on each call", () => {
    const builder = transcript().user("a");
    const first = builder.toJSON();
    const second = builder.toJSON();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});
