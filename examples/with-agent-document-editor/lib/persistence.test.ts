import { describe, expect, it } from "vitest";
import { initialDocument } from "./document-state";
import { readSaved } from "./persistence";

describe("readSaved", () => {
  it("keeps valid entries and drops one the app could not render", () => {
    const document = { name: "document", state: initialDocument };
    const saved = JSON.stringify({
      document,
      comments: { name: "comments", state: { comments: null } },
    });

    expect(readSaved(saved)).toEqual({ document });
  });

  it("reads nothing from an empty or non-object value", () => {
    expect(readSaved(null)).toBeUndefined();
    expect(readSaved("7")).toBeUndefined();
  });
});
