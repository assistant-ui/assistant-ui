import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERATED_SECTION_INDEXES,
  sectionIndexFile,
  sectionIndexGroups,
  syncSectionIndex,
} from "./section-index";

const DOCS = path.resolve(__dirname, "../content/docs");

type Meta = { pages?: string[] };

const readMeta = (dir: string): Meta => {
  const file = path.join(dir, "meta.json");
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Meta)
    : {};
};

// The url segment a folder adds: group folders such as "(auth)" add none.
const segment = (name: string) => (/^\(.*\)$/.test(name) ? [] : [name]);

// Every page url a section's sidebar shows, following its meta.json files the
// way the nav does: "...folder" inlines a folder, a nested folder adds its
// pages, and separators and external links are skipped.
const navUrls = (dir: string, segments: string[]): string[] => {
  const urls: string[] = [];
  for (const entry of readMeta(dir).pages ?? []) {
    if (entry.startsWith("---") || entry.startsWith("[") || entry === "...") {
      continue;
    }
    const inline = entry.startsWith("...");
    const name = inline ? entry.slice(3) : entry;
    const child = path.join(dir, name);
    if (existsSync(child) && statSync(child).isDirectory()) {
      const childSegments = [...segments, ...segment(name)];
      if (existsSync(path.join(child, "index.mdx"))) {
        urls.push(["/docs", ...childSegments].join("/"));
      }
      urls.push(...navUrls(child, childSegments));
    } else if (name !== "index") {
      urls.push(["/docs", ...segments, name].join("/"));
    }
  }
  return urls;
};

// Section landing pages that list the section's pages as cards. A page added
// to the nav has to be added to its section's index too, or readers who start
// from the index never find it. The generated ones list every page by
// construction; the rest are written by hand.
const SECTION_INDEXES = [
  "guides",
  "integrations",
  "migrations",
  "primitives",
  ...GENERATED_SECTION_INDEXES,
];

describe("section indexes", () => {
  it.each(SECTION_INDEXES)(
    "%s/index.mdx links every page in its nav",
    (section) => {
      const dir = path.join(DOCS, section);
      const index = readFileSync(path.join(dir, "index.mdx"), "utf8");
      const unlinked = navUrls(dir, [section]).filter(
        (url) =>
          !index.includes(`href="${url}"`) && !index.includes(`](${url})`),
      );
      expect(unlinked).toEqual([]);
    },
  );
});

describe("generated section indexes", () => {
  it.each(GENERATED_SECTION_INDEXES)(
    "%s/index.mdx lists the pages its meta.json files name, with their descriptions",
    (section) => {
      const source = readFileSync(sectionIndexFile(section), "utf8");
      // On failure, run `pnpm -C apps/docs generate:section-indexes`.
      expect(source).toBe(
        syncSectionIndex(source, sectionIndexGroups(section)),
      );
    },
  );
});
