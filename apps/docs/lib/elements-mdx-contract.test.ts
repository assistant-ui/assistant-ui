import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CONTENT_DIR = join(process.cwd(), "content/elements");

const files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith(".mdx"));

describe("elements MDX contract", () => {
  it.each(files)("%s", (name) => {
    const text = readFileSync(join(CONTENT_DIR, name), "utf8");

    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatter, "frontmatter block").toBeTruthy();
    expect(frontmatter![1]).toMatch(/^title: /m);
    expect(frontmatter![1]).toMatch(/^description: /m);

    expect(
      /^## Installation$/m.test(text),
      "## Installation is owned by the page shell",
    ).toBe(false);
    expect(
      /^## Source$/m.test(text),
      "## Source is banned: the install delivers the component source, docs do not restate it",
    ).toBe(false);

    let mode: string | null = null;
    for (const [index, line] of text.split("\n").entries()) {
      const open = line.match(/^\s*<(RuntimeMode|StandaloneMode)>\s*$/);
      const close = line.match(/^\s*<\/(RuntimeMode|StandaloneMode)>\s*$/);
      if (open) {
        expect(mode, `line ${index + 1}: nested mode block`).toBeNull();
        mode = open[1]!;
      } else if (close) {
        expect(close[1], `line ${index + 1}: mismatched close tag`).toBe(mode);
        mode = null;
      } else if (mode !== null && /^#{1,2} /.test(line)) {
        throw new Error(
          `${name} line ${index + 1}: H1/H2 inside <${mode}> — section headings must be mode-neutral and live outside mode blocks`,
        );
      }
    }
    expect(mode, "unclosed mode block").toBeNull();

    const headings = [...text.matchAll(/^(#{2,3}) (.+)$/gm)].map((m) =>
      m[2]!.trim(),
    );
    const seen = new Set<string>();
    for (const heading of headings) {
      expect(
        seen.has(heading),
        `duplicate heading "${heading}" — anchors must be unique`,
      ).toBe(false);
      seen.add(heading);
    }
  });
});
