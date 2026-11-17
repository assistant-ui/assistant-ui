import { describe, expect, it } from "vitest";
import type { DocumentState } from "./document-state";
import {
  documentToMarkdown,
  markdownFileName,
  readShareLink,
  shareLink,
} from "./share";

const document: DocumentState = {
  title: "Café plan",
  blocks: [
    { id: "b1", type: "h2", text: "Goals" },
    {
      id: "b2",
      type: "paragraph",
      text: "Open by **June**, on a “soft” start.",
    },
    { id: "b3", type: "bullet", text: "Hire two baristas" },
    { id: "b4", type: "bullet", text: "Order the grinder" },
    { id: "b5", type: "numbered", text: "Sign the lease" },
    { id: "b6", type: "divider", text: "" },
    { id: "b7", type: "quote", text: "Small is fine." },
  ],
};

describe("share link", () => {
  it("carries the document in the fragment and gives it back unchanged", () => {
    const link = shareLink(document, "https://example.com/editor?tab=1#old");
    const url = new URL(link);

    expect(`${url.origin}${url.pathname}${url.search}`).toBe(
      "https://example.com/editor?tab=1",
    );
    expect(url.hash).toMatch(/^#doc=[A-Za-z0-9_-]+$/);
    expect(readShareLink(url.hash)).toEqual(document);
  });

  it("ignores a fragment that is not a share link", () => {
    expect(readShareLink("")).toBeUndefined();
    expect(readShareLink("#write")).toBeUndefined();
  });

  it("ignores a share link that is cut short or holds something else", () => {
    const { hash } = new URL(shareLink(document, "https://example.com/"));
    const notADocument = new URL(
      shareLink(
        { title: "x", blocks: [{ id: "b1" }] } as unknown as DocumentState,
        "https://example.com/",
      ),
    ).hash;

    expect(readShareLink(hash.slice(0, hash.length - 9))).toBeUndefined();
    expect(readShareLink("#doc=%%%")).toBeUndefined();
    expect(readShareLink(notADocument)).toBeUndefined();
  });
});

describe("markdown export", () => {
  it("puts the title on top, keeps a list together and separates the rest", () => {
    expect(documentToMarkdown(document)).toBe(
      [
        "# Café plan",
        "",
        "## Goals",
        "",
        "Open by **June**, on a “soft” start.",
        "",
        "- Hire two baristas",
        "- Order the grinder",
        "",
        "1. Sign the lease",
        "",
        "---",
        "",
        "> Small is fine.",
        "",
      ].join("\n"),
    );
  });

  it("does not repeat the title above a document that opens with a heading", () => {
    const titled: DocumentState = {
      title: "Café plan",
      blocks: [{ id: "b1", type: "h1", text: "Café plan" }],
    };

    expect(documentToMarkdown(titled)).toBe("# Café plan\n");
  });

  it("names the file after the title", () => {
    expect(markdownFileName(document)).toBe("café-plan.md");
    expect(markdownFileName({ title: "  ", blocks: [] })).toBe("document.md");
  });
});
