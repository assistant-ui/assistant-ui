import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const read = (relative: string) =>
  readFileSync(path.join(ROOT, relative), "utf8");

type Entry = { name: string; description: string };

const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name);

const cliEntries = (category: "template" | "example"): Entry[] => {
  const source = read("packages/cli/src/commands/create.ts");
  const pattern = new RegExp(
    `name:\\s*"([^"]+)",[^}]*?description:\\s*"([^"]+)",[^}]*?category:\\s*"${category}"`,
    "g",
  );
  return [...source.matchAll(pattern)]
    .map(([, name = "", description = ""]) => ({ name, description }))
    .sort(byName);
};

const docsEntries = (heading: string, until: string): Entry[] => {
  const doc = read("apps/docs/content/docs/(getting-started)/cli.mdx");
  const start = doc.indexOf(heading);
  const end = doc.indexOf(until, start);
  const section = doc.slice(start, end === -1 ? undefined : end);
  return [...section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/gm)]
    .map(([, name = "", description = ""]) => ({ name, description }))
    .sort(byName);
};

describe("cli.mdx mirrors the CLI's project metadata", () => {
  it("documents every template with the CLI's own description", () => {
    expect(
      docsEntries("**Available Templates**", "**Available Examples**"),
    ).toEqual(cliEntries("template"));
  });

  it("documents every example the CLI can scaffold", () => {
    const documented = docsEntries("**Available Examples**", "\n## ");
    expect(documented.map((entry) => entry.name)).toEqual(
      cliEntries("example").map((entry) => entry.name),
    );
  });
});
