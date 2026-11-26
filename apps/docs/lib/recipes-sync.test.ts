import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const RECIPES = path.join(ROOT, "apps/docs/content/docs/recipes");

// Each recipe page shows code from the example app CI builds and tests.
const EXAMPLES: Record<string, string> = {
  "own-backend": "examples/recipe-own-backend",
  "chat-history": "examples/recipe-chat-history",
  "tool-ui": "examples/recipe-tool-ui",
  "tool-approval": "examples/recipe-tool-approval",
};

const FILE_FENCE = /^```\w+ title="([^"]+\.tsx?)"\n([\s\S]*?)\n```$/gm;

const pages = readdirSync(RECIPES)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => file.replace(/\.mdx$/, ""));

describe("recipe pages show their example's code verbatim", () => {
  it("every recipe page has an example app", () => {
    expect(pages.sort()).toEqual(Object.keys(EXAMPLES).sort());
  });

  for (const [slug, example] of Object.entries(EXAMPLES)) {
    it(`${slug} matches ${example}`, () => {
      const page = readFileSync(path.join(RECIPES, `${slug}.mdx`), "utf8");
      const fences = [...page.matchAll(FILE_FENCE)];
      expect(fences.length).toBeGreaterThan(1);
      for (const [, file, code] of fences) {
        const source = path.join(ROOT, example, file!);
        expect(existsSync(source), `${example}/${file} exists`).toBe(true);
        expect(code, `${slug}.mdx shows ${example}/${file} as is`).toBe(
          readFileSync(source, "utf8").replace(/\n$/, ""),
        );
      }
      expect(page).toContain(
        `https://github.com/assistant-ui/assistant-ui/tree/main/${example}`,
      );
    });
  }
});
