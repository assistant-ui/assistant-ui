import { describe, it, expect } from "vitest";
import type { TextNode } from "lexical";
import { findTriggerMatch } from "./DirectivePlugin";

function mockTextNode(text: string): TextNode {
  return { getTextContent: () => text } as unknown as TextNode;
}

describe("findTriggerMatch", () => {
  it("finds @query at cursor", () => {
    const node = mockTextNode("hello @wea");
    const result = findTriggerMatch("@", node, 10);
    expect(result).toEqual({
      query: "wea",
      node,
      startOffset: 6,
      endOffset: 10,
    });
  });

  it("returns null when cursor is before trigger", () => {
    const node = mockTextNode("hello @weather");
    expect(findTriggerMatch("@", node, 5)).toBeNull();
  });

  it("returns null when no trigger exists", () => {
    const node = mockTextNode("hello world");
    expect(findTriggerMatch("@", node, 11)).toBeNull();
  });

  it("requires whitespace or start before trigger", () => {
    const node = mockTextNode("email@test");
    expect(findTriggerMatch("@", node, 10)).toBeNull();
  });

  it("detects trigger at start of text", () => {
    const node = mockTextNode("@foo");
    const result = findTriggerMatch("@", node, 4);
    expect(result).toEqual({
      query: "foo",
      node,
      startOffset: 0,
      endOffset: 4,
    });
  });

  it("stops at whitespace before cursor", () => {
    const node = mockTextNode("@foo bar");
    expect(findTriggerMatch("@", node, 8)).toBeNull();
  });

  it("stops at newline", () => {
    const node = mockTextNode("@foo\nbar");
    expect(findTriggerMatch("@", node, 8)).toBeNull();
  });

  it("returns empty query right after trigger", () => {
    const node = mockTextNode("hello @");
    const result = findTriggerMatch("@", node, 7);
    expect(result).toEqual({
      query: "",
      node,
      startOffset: 6,
      endOffset: 7,
    });
  });

  it("trigger preceded by newline", () => {
    const node = mockTextNode("line1\n@foo");
    const result = findTriggerMatch("@", node, 10);
    expect(result).toEqual({
      query: "foo",
      node,
      startOffset: 6,
      endOffset: 10,
    });
  });

  it("works with multi-char trigger", () => {
    const node = mockTextNode("hello @@foo");
    const result = findTriggerMatch("@@", node, 11);
    expect(result).toEqual({
      query: "foo",
      node,
      startOffset: 6,
      endOffset: 11,
    });
  });

  it("only considers text up to anchorOffset", () => {
    const node = mockTextNode("@first @second");
    const result = findTriggerMatch("@", node, 6);
    expect(result).toEqual({
      query: "first",
      node,
      startOffset: 0,
      endOffset: 6,
    });
  });

  it("treats full-width space (U+3000) as a boundary", () => {
    const node = mockTextNode("hello\u3000@foo");
    const result = findTriggerMatch("@", node, 10);
    expect(result).toEqual({
      query: "foo",
      node,
      startOffset: 6,
      endOffset: 10,
    });
  });

  it("treats non-breaking space (U+00A0) as a boundary", () => {
    const node = mockTextNode("hello\u00a0@foo");
    const result = findTriggerMatch("@", node, 10);
    expect(result).toEqual({
      query: "foo",
      node,
      startOffset: 6,
      endOffset: 10,
    });
  });
});
