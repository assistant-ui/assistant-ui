import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/paths.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/paths.js")>()),
  listDirContents: vi.fn(async () => ({
    directories: [],
    files: ["first.mdx", "second.mdx"],
  })),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    stat: vi.fn(async (path: string) => ({
      isFile: () => path.endsWith(".mdx"),
      isDirectory: () => !path.endsWith(".mdx"),
      size: 600 * 1024,
    })),
  };
});

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
    expect(parsed.files).toEqual(["first", "second"]);
    expect(parsed.content).toBeUndefined();
    expect(parsed.hint).toContain("exceeds");
  });
});
