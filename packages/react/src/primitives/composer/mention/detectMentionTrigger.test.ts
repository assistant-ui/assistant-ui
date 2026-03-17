import { describe, it, expect } from "vitest";
import { detectMentionTrigger } from "./ComposerMentionContext";

describe("detectMentionTrigger", () => {
  it("detects @query at cursor position", () => {
    expect(detectMentionTrigger("hello @wea", "@", 10)).toEqual({
      query: "wea",
      offset: 6,
    });
  });

  it("returns null when cursor is before the trigger", () => {
    expect(detectMentionTrigger("hello @weather", "@", 5)).toBeNull();
  });

  it("returns null when no trigger character", () => {
    expect(detectMentionTrigger("hello world", "@", 11)).toBeNull();
  });

  it("requires whitespace or start before trigger", () => {
    expect(detectMentionTrigger("email@test", "@", 10)).toBeNull();
  });

  it("trigger at start of text", () => {
    expect(detectMentionTrigger("@foo", "@", 4)).toEqual({
      query: "foo",
      offset: 0,
    });
  });

  it("stops at whitespace in query", () => {
    // "@foo bar" — space terminates the mention
    expect(detectMentionTrigger("@foo bar", "@", 8)).toBeNull();
  });

  it("stops at newline", () => {
    expect(detectMentionTrigger("@foo\nbar", "@", 8)).toBeNull();
  });

  it("finds trigger closest to cursor, not earlier ones", () => {
    // Text has two @: "hello @old text @new"
    // Cursor at end → should find @new
    expect(detectMentionTrigger("hello @old text @new", "@", 20)).toEqual({
      query: "new",
      offset: 16,
    });
  });

  it("ignores trigger after cursor", () => {
    // Cursor at position 5, trigger at position 10
    expect(detectMentionTrigger("hello text @foo", "@", 5)).toBeNull();
  });

  it("works with multi-char trigger", () => {
    expect(detectMentionTrigger("hello @@foo", "@@", 11)).toEqual({
      query: "foo",
      offset: 6,
    });
  });

  it("empty query when cursor is right after trigger", () => {
    expect(detectMentionTrigger("hello @", "@", 7)).toEqual({
      query: "",
      offset: 6,
    });
  });
});
