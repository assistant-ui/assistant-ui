import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/mdx.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/mdx.js")>()),
  readMDXFile: vi.fn(async () => ({
    content: "x".repeat(600 * 1024),
    frontmatter: {},
  })),
  formatMDXContent: (mdx: { content: string }) => mdx.content,
}));

import { docsTools } from "../docs.js";

function parse(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]!.text);
}

describe("assistantUIDocs directory aggregate size cap", () => {
  it("omits inlined content and returns a hint when a directory exceeds the cap", async () => {
    const result = await docsTools.execute({
      paths: ["(reference)/api-reference/primitives"],
    });
    const parsed = parse(result);

    expect(parsed.type).toBe("directory");
    expect(parsed.files.length).toBeGreaterThan(1);
    expect(parsed.content).toBeUndefined();
    expect(parsed.hint).toContain("exceeds");
  });
});
