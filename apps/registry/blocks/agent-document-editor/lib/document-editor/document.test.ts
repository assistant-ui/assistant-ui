import { describe, expect, it } from "vitest";
import { countWords, documentTitle, replaceOnce } from "./document";

describe("replaceOnce", () => {
  it("replaces the one passage that matches", () => {
    expect(replaceOnce("Ship on Friday.", "Friday", "Monday")).toEqual({
      ok: true,
      content: "Ship on Monday.",
    });
  });

  it("keeps replacement text literal", () => {
    expect(replaceOnce("Cost: TBD", "TBD", "$& and $1")).toEqual({
      ok: true,
      content: "Cost: $& and $1",
    });
  });

  it("rejects a passage that is not in the document", () => {
    const result = replaceOnce("Ship on Friday.", "Tuesday", "Monday");
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error", expect.stringContaining("match"));
  });

  it("rejects a passage that matches more than one place", () => {
    const result = replaceOnce("the plan, the scope", "the", "a");
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("2 places"),
    });
  });

  it("rejects an empty passage", () => {
    expect(replaceOnce("Ship on Friday.", "", "Now. ").ok).toBe(false);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("  one two\n\nthree ")).toBe(3);
  });

  it("counts nothing in a blank document", () => {
    expect(countWords(" \n ")).toBe(0);
  });
});

describe("documentTitle", () => {
  it("reads the first heading", () => {
    expect(documentTitle("Intro\n\n## Launch plan \n\n# Later")).toBe(
      "Launch plan",
    );
  });

  it("falls back when the document has no heading", () => {
    expect(documentTitle("Just a paragraph with a # in it.")).toBe("Untitled");
  });
});
