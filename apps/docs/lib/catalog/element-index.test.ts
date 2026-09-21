import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { registry } from "../../../registry/src/registry";
import { ELEMENT_INDEX } from "./element-index";

const source = readFileSync(
  join(process.cwd(), "components/pages/elements/registry.tsx"),
  "utf8",
);

const field = (entry: string, key: string) =>
  entry.match(new RegExp(`\\n {8}${key}:\\s*"([^"]+)"`))?.[1];

// Static entries are object literals at a fixed oxfmt indent; the generated
// entries below them are built by a map call and carry no literal slug.
const staticEntries = source
  .slice(source.indexOf("export const ELEMENT_SECTIONS"))
  .split(/\n {8}slug: "/)
  .slice(1)
  .map((chunk) => {
    const entry = chunk.slice(0, chunk.indexOf("\n      },"));
    const slug = entry.slice(0, entry.indexOf('"'));
    return [
      slug,
      field(entry, "title"),
      field(entry, "registryName") ??
        `elements-${field(entry, "installName") ?? slug}`,
      field(entry, "connection") === "AUI",
    ] as const;
  });

it("reads the static entries of the elements registry", () => {
  expect(staticEntries.length).toBeGreaterThan(100);
  expect(staticEntries.every(([, title]) => title !== undefined)).toBe(true);
});

it("mirrors every static element that has a page", () => {
  const pages = new Set(
    readdirSync(join(process.cwd(), "content/elements")).map((file) =>
      file.replace(/\.mdx$/, ""),
    ),
  );
  expect(ELEMENT_INDEX).toEqual(
    staticEntries.filter(([slug]) => pages.has(slug)),
  );
});

it("names only items the registry can install", () => {
  const installable = new Set(registry.map((item) => item.name));
  expect(
    ELEMENT_INDEX.map(([, , item]) => item).filter(
      (item) => !installable.has(item),
    ),
  ).toEqual([]);
});
