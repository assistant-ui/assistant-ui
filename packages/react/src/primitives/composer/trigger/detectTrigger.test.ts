import { describe, it, expect } from "vitest";
import { detectTrigger, type TriggerMatcher } from "./detectTrigger";

const matchFromLastTrigger: TriggerMatcher = (
  text,
  triggerChar,
  cursorPosition,
) => {
  const textUpToCursor = text.slice(0, cursorPosition);
  const offset = textUpToCursor.lastIndexOf(triggerChar);
  if (offset === -1) return null;
  return {
    query: textUpToCursor.slice(offset + triggerChar.length),
    offset,
    endOffset: cursorPosition,
  };
};

describe("detectTrigger", () => {
  it("detects @query at cursor position", () => {
    expect(detectTrigger("hello @wea", "@", 10)).toEqual({
      query: "wea",
      offset: 6,
      endOffset: 10,
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
      endOffset: 4,
    });
  });

  it("stops at whitespace in query", () => {
    expect(detectTrigger("@foo bar", "@", 8)).toBeNull();
  });

  it("uses a custom matcher for multi-word queries", () => {
    expect(
      detectTrigger("hello @Example UK", "@", 17, matchFromLastTrigger),
    ).toEqual({
      query: "Example UK",
      offset: 6,
      endOffset: 17,
    });
  });

  it("keeps a matcher endOffset that is not the query length", () => {
    const matchNormalized: TriggerMatcher = (
      text,
      triggerChar,
      cursorPosition,
    ) => {
      const textUpToCursor = text.slice(0, cursorPosition);
      const offset = textUpToCursor.lastIndexOf(triggerChar);
      if (offset === -1) return null;
      return {
        query: "example",
        offset,
        endOffset: cursorPosition,
      };
    };

    expect(
      detectTrigger("hello @Example UK", "@", 17, matchNormalized),
    ).toEqual({
      query: "example",
      offset: 6,
      endOffset: 17,
    });
  });

  it("rejects a matcher whose offset is not the trigger", () => {
    const match: TriggerMatcher = () => ({
      query: "x",
      offset: 0,
      endOffset: 2,
    });
    expect(detectTrigger("hello @x", "@", 8, match)).toBeNull();
  });

  it("rejects a matcher that matches at the caret", () => {
    const match: TriggerMatcher = () => ({
      query: "",
      offset: 6,
      endOffset: 7,
    });
    expect(detectTrigger("hello @foo", "@", 6, match)).toBeNull();
  });

  it("rejects a matcher whose endOffset is inside the trigger", () => {
    const match: TriggerMatcher = () => ({
      query: "",
      offset: 6,
      endOffset: 6,
    });
    expect(detectTrigger("hello @foo", "@", 10, match)).toBeNull();
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
      endOffset: 10,
    });
  });

  it("finds trigger closest to cursor, not earlier ones", () => {
    expect(detectTrigger("hello @old text @new", "@", 20)).toEqual({
      query: "new",
      offset: 16,
      endOffset: 20,
    });
  });

  it("ignores trigger after cursor", () => {
    expect(detectTrigger("hello text @foo", "@", 5)).toBeNull();
  });

  it("works with multi-char trigger", () => {
    expect(detectTrigger("hello @@foo", "@@", 11)).toEqual({
      query: "foo",
      offset: 6,
      endOffset: 11,
    });
  });

  it("empty query when cursor is right after trigger", () => {
    expect(detectTrigger("hello @", "@", 7)).toEqual({
      query: "",
      offset: 6,
      endOffset: 7,
    });
  });

  it("treats U+3000 full-width space before trigger as boundary", () => {
    expect(detectTrigger("全角\u3000@foo", "@", 7)).toEqual({
      query: "foo",
      offset: 3,
      endOffset: 7,
    });
  });

  it("treats U+00A0 NBSP before trigger as boundary", () => {
    expect(detectTrigger("x\u00A0@foo", "@", 6)).toEqual({
      query: "foo",
      offset: 2,
      endOffset: 6,
    });
  });

  it("stops at U+3000 full-width space inside query", () => {
    expect(detectTrigger("@foo\u3000bar", "@", 8)).toBeNull();
  });

  it("IME full-width space before trigger char acts as boundary", () => {
    expect(detectTrigger("hello\u3000@foo", "@", 10)).toEqual({
      query: "foo",
      offset: 6,
      endOffset: 10,
    });
  });

  it("NBSP between word and trigger acts as boundary", () => {
    expect(detectTrigger("hello\u00a0@foo", "@", 10)).toEqual({
      query: "foo",
      offset: 6,
      endOffset: 10,
    });
  });

  it("full-width trigger char does NOT match ASCII trigger (literal comparison)", () => {
    expect(detectTrigger("hello \uff20foo", "@", 10)).toBeNull();
  });
});
