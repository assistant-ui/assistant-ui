import { describe, expect, it } from "vitest";

import { transcript } from "../transcript/builder";

describe("transcript().inject", () => {
  it("cancel records at the most recent turn", () => {
    expect(transcript().user("hi").inject.cancel().toJSON().injections).toEqual(
      [{ kind: "cancel", at: { turnIndex: 0 } }],
    );
  });

  it("interrupt with reason", () => {
    expect(
      transcript().user("hi").inject.interrupt("user-pressed-stop").toJSON()
        .injections[0],
    ).toEqual({
      kind: "interrupt",
      at: { turnIndex: 0 },
      reason: "user-pressed-stop",
    });
  });

  it("transportError with code and message", () => {
    expect(
      transcript()
        .user("hi")
        .inject.transportError({ code: 500, message: "boom" })
        .toJSON().injections[0],
    ).toEqual({
      kind: "transportError",
      at: { turnIndex: 0 },
      code: 500,
      message: "boom",
    });
  });

  it("abortAndRestart", () => {
    expect(
      transcript().user("hi").inject.abortAndRestart().toJSON().injections[0],
    ).toEqual({
      kind: "abortAndRestart",
      at: { turnIndex: 0 },
    });
  });

  it("inject before any turn throws", () => {
    expect(() => transcript().inject.cancel()).toThrow(/at least one turn/i);
  });

  it("returns a ReadyBuilder so chaining continues", () => {
    const t = transcript().user("hi").inject.cancel().user("retry").toJSON();
    expect(t.turns).toHaveLength(2);
    expect(t.injections).toHaveLength(1);
  });
});

describe("inject.disconnect", () => {
  it("targets the most recent assistantStream turn with afterChunk", () => {
    const t = transcript()
      .user("q")
      .assistantStream("hello world", { chunks: ["hello ", "world"] })
      .inject.disconnect({ afterChunk: 1 })
      .toJSON();

    expect(t.injections).toEqual([
      { kind: "disconnect", at: { turnIndex: 1, afterChunk: 1 } },
    ]);
  });

  it("disconnect is not on the inject namespace before a stream", () => {
    const ready = transcript().user("hi");
    expect(() => {
      // @ts-expect-error disconnect requires an immediately-prior assistantStream.
      ready.inject.disconnect({ afterChunk: 0 });
    }).toThrow();
  });

  it("disconnect afterChunk out of range throws", () => {
    expect(() =>
      transcript()
        .assistantStream("hi", { chunks: ["h", "i"] })
        .inject.disconnect({ afterChunk: 5 }),
    ).toThrow(/afterChunk/i);
  });
});
