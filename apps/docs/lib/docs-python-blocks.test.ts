import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

// Every Markdown page that can hold a Python block: the docs site and the
// READMEs the Python packages publish to PyPI.
const PAGES = [
  ...readdirSync(path.join(ROOT, "apps/docs/content"), { recursive: true })
    .map((file) => `apps/docs/content/${file}`)
    .filter((file) => /\.mdx?$/.test(file)),
  ...readdirSync(path.join(ROOT, "python"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
      readdirSync(path.join(ROOT, "python", dir.name))
        .filter((file) => /^README.*\.md$/.test(file))
        .map((file) => `python/${dir.name}/${file}`),
    ),
].filter((file) =>
  /^\s*(`{3,}|~{3,})(python|py|python3)(\s|$)/m.test(
    readFileSync(path.join(ROOT, file), "utf8"),
  ),
);

// Names a page leaves to the reader on purpose: their own app, auth or
// settings, or the inside of a function an earlier block defines. Every
// other name a block uses must come from Python, from the block itself or
// from a block above it on the same page.
const READER_SUPPLIED: Record<string, string[]> = {};

type Block = {
  file: string;
  line: number;
  syntax?: string;
  undefined?: string[];
  imports?: string[];
  keywords?: string[];
};

const hasPython = (() => {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasPython && !process.env.CI)(
  "Python blocks in the docs",
  () => {
    const blocks = hasPython
      ? execFileSync(
          "python3",
          ["-I", path.join(__dirname, "python-blocks.py"), ROOT, ...PAGES],
          { encoding: "utf8" },
        )
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Block)
      : [];

    it("finds the blocks", () => {
      expect(blocks.length).toBeGreaterThan(30);
    });

    it("compile", () => {
      expect(
        blocks
          .filter((block) => block.syntax)
          .map((block) => `${block.file}:${block.line} ${block.syntax}`),
      ).toEqual([]);
    });

    it("use only names Python or the page defines", () => {
      expect(
        blocks.flatMap((block) => {
          const allowed = READER_SUPPLIED[block.file] ?? [];
          const missing = (block.undefined ?? []).filter(
            (name) => !allowed.includes(name),
          );
          return missing.length
            ? [`${block.file}:${block.line} ${missing.join(", ")}`]
            : [];
        }),
      ).toEqual([]);
    });

    it("import only what the repo's Python packages define", () => {
      expect(
        blocks.flatMap((block) =>
          (block.imports ?? []).map(
            (name) => `${block.file}:${block.line} ${name}`,
          ),
        ),
      ).toEqual([]);
    });

    it("pass only keyword arguments the packages accept", () => {
      expect(
        blocks.flatMap((block) =>
          (block.keywords ?? []).map(
            (call) => `${block.file}:${block.line} ${call}`,
          ),
        ),
      ).toEqual([]);
    });

    it("leave no stale reader-supplied names", () => {
      const used = new Set(
        blocks.flatMap((block) =>
          (block.undefined ?? []).map((name) => `${block.file} ${name}`),
        ),
      );
      expect(
        Object.entries(READER_SUPPLIED).flatMap(([file, names]) =>
          names
            .filter((name) => !used.has(`${file} ${name}`))
            .map((name) => `${file} ${name}`),
        ),
      ).toEqual([]);
    });
  },
);
