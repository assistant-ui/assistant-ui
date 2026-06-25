import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { sliceMessagesUntil } from "./sliceMessagesUntil";

const msg = (id: string, role: UIMessage["role"]): UIMessage =>
  ({ id, role, parts: [] }) as any;

describe("sliceMessagesUntil", () => {
  it("returns an empty array when the message id is null", () => {
    expect(
      sliceMessagesUntil([msg("u1", "user"), msg("a1", "assistant")], null),
    ).toEqual([]);
  });

  it("throws when the message id is not found", () => {
    expect(() => sliceMessagesUntil([msg("u1", "user")], "missing")).toThrow(
      "Message not found",
    );
  });

  it("slices up to and including the target when no assistant follows", () => {
    const messages = [
      msg("u1", "user"),
      msg("a1", "assistant"),
      msg("u2", "user"),
    ];
    expect(sliceMessagesUntil(messages, "u2").map((m) => m.id)).toEqual([
      "u1",
      "a1",
      "u2",
    ]);
  });

  it("extends the slice to include trailing assistant messages", () => {
    const messages = [
      msg("u1", "user"),
      msg("a1", "assistant"),
      msg("a2", "assistant"),
      msg("u2", "user"),
    ];
    expect(sliceMessagesUntil(messages, "u1").map((m) => m.id)).toEqual([
      "u1",
      "a1",
      "a2",
    ]);
  });

  it("returns the whole array when the target is the last message", () => {
    const messages = [msg("u1", "user"), msg("a1", "assistant")];
    expect(sliceMessagesUntil(messages, "a1").map((m) => m.id)).toEqual([
      "u1",
      "a1",
    ]);
  });
});
