import { describe, it, expect } from "vitest";
import { detectTrigger } from "./detectTrigger";

describe("detectTrigger", () => {
  it("detects @query at cursor position", () => {
    expect(detectTrigger("hello @wea", "@", 10)).toEqual({
      query: "wea",
      offset: 6,
    });
  });

  it("returns null when cursor is before the trigger", () => {
    expect(detectTrigger("hello @weather", "@", 5)).toBeNull();
  });

  it("returns null when no trigger character", () => {
    expect(detectTrigger("hello world", "@", 11)).toBeNull();
  });

  it("requires whitespace or start before trigger", () => {
    expect(detectTrigger("email@test", "@", 10)).toBeNull();
  });

  it("trigger at start of text", () => {
    expect(detectTrigger("@foo", "@", 4)).toEqual({
      query: "foo",
      offset: 0,
    });
  });

  it("stops at whitespace in query", () => {
    // "@foo bar" — space terminates the mention
    expect(detectTrigger("@foo bar", "@", 8)).toBeNull();
  });

  it("stops at newline", () => {
    expect(detectTrigger("@foo\nbar", "@", 8)).toBeNull();
  });

  it("stops at tab", () => {
    expect(detectTrigger("@foo\tbar", "@", 8)).toBeNull();
  });

  it("treats tab before trigger as valid boundary", () => {
    expect(detectTrigger("hello\t@foo", "@", 10)).toEqual({
      query: "foo",
      offset: 6,
    });
  });

  it("finds trigger closest to cursor, not earlier ones", () => {
    // Text has two @: "hello @old text @new"
    // Cursor at end → should find @new
    expect(detectTrigger("hello @old text @new", "@", 20)).toEqual({
      query: "new",
      offset: 16,
    });
  });

  it("ignores trigger after cursor", () => {
    // Cursor at position 5, trigger at position 10
    expect(detectTrigger("hello text @foo", "@", 5)).toBeNull();
  });

  it("works with multi-char trigger", () => {
    expect(detectTrigger("hello @@foo", "@@", 11)).toEqual({
      query: "foo",
      offset: 6,
    });
  });

  it("empty query when cursor is right after trigger", () => {
    expect(detectTrigger("hello @", "@", 7)).toEqual({
      query: "",
      offset: 6,
    });
  });
});
