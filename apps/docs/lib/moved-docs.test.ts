import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compile, match } from "next/dist/compiled/path-to-regexp";
import {
  MOVED_DOCS_PATHS,
  MOVED_DOCS_REDIRECTS,
  rewriteMovedDocsPath,
} from "./moved-docs";

const CONTENT = path.resolve(__dirname, "../content/docs");

// Every url a content file serves under /docs, /elements and /design: group
// folders such as "(getting-started)" add no segment, and index.mdx serves its
// folder. The elements catalog root is a page of its own.
const pageUrls = (): Set<string> => {
  const urls = new Set<string>(["/elements"]);
  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const group = /^\(.*\)$/.test(entry.name);
        walk(
          path.join(dir, entry.name),
          group ? segments : [...segments, entry.name],
        );
      } else if (entry.name.endsWith(".mdx")) {
        const name = entry.name.slice(0, -".mdx".length);
        const parts = name === "index" ? segments : [...segments, name];
        urls.add(["", ...parts].join("/"));
      }
    }
  };
  for (const section of ["docs", "elements", "design"]) {
    walk(path.join(CONTENT, "..", section), [section]);
  }
  return urls;
};

// The heading ids and AnchorAlias ids of the page a /docs url serves, with
// headings slugged the way the docs site slugs them.
const pageAnchors = (url: string): Set<string> => {
  const rel = url.replace(/^\/docs\/?/, "");
  const candidates = [`${rel}.mdx`, `${rel}/index.mdx`].map((file) =>
    findPageFile(CONTENT, file.split("/")),
  );
  const file = candidates.find(Boolean);
  if (!file) return new Set();
  const source = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  const ids = new Set<string>();
  for (const [, heading] of source.matchAll(/^#{1,6} (.+)$/gm)) {
    ids.add(
      heading!
        .replace(/`/g, "")
        .trim()
        .toLowerCase()
        .replace(/[^\w\- ]/g, "")
        .replace(/ /g, "-"),
    );
  }
  for (const [, id] of source.matchAll(/<AnchorAlias id="([^"]+)"/g)) {
    ids.add(id!);
  }
  return ids;
};

// The content file for a url's segments, looking through group folders such
// as "(getting-started)" that add no url segment.
const findPageFile = (dir: string, segments: string[]): string | undefined => {
  const [head, ...rest] = segments;
  if (!head) return undefined;
  if (rest.length === 0) {
    const direct = path.join(dir, head);
    if (existsSync(direct)) return direct;
  } else if (existsSync(path.join(dir, head))) {
    const found = findPageFile(path.join(dir, head), rest);
    if (found) return found;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\(.*\)$/.test(entry.name)) {
      const found = findPageFile(path.join(dir, entry.name), segments);
      if (found) return found;
    }
  }
  return undefined;
};

const follow = (url: string) => {
  for (const redirect of MOVED_DOCS_REDIRECTS) {
    const matched = match(redirect.source, { decode: decodeURIComponent })(url);
    if (!matched) continue;
    return compile(redirect.destination, { validate: false })(matched.params);
  }
  return null;
};

describe("moved docs", () => {
  const urls = pageUrls();

  it("points every old url at a page that exists", () => {
    const missing = MOVED_DOCS_PATHS.map(([, to]) => to.split("#")[0]!).filter(
      (to) => !urls.has(to),
    );
    expect(missing).toEqual([]);
  });

  it("points every #fragment at a heading or anchor alias on its page", () => {
    const missing = MOVED_DOCS_PATHS.map(([, to]) => to)
      .filter((to) => to.includes("#"))
      .filter((to) => {
        const [page, fragment] = to.split("#") as [string, string];
        return !pageAnchors(page).has(fragment);
      });
    expect(missing).toEqual([]);
  });

  it("leaves no page behind at an old url", () => {
    const shadowed = MOVED_DOCS_PATHS.map(([from]) => from).filter((from) =>
      urls.has(from),
    );
    expect(shadowed).toEqual([]);
  });

  it("redirects the page and its markdown urls", () => {
    expect(follow("/docs/runtimes/concepts/threads")).toBe(
      "/docs/concepts/threads",
    );
    expect(follow("/docs/runtimes/concepts/threads.md")).toBe(
      "/docs/concepts/threads.md",
    );
    expect(follow("/docs/guides/context-api.mdx")).toBe(
      "/docs/concepts/context-api.md",
    );
    expect(follow("/docs/runtimes/custom/overview")).toBe(
      "/docs/runtimes/pick-a-runtime#your-own-backend",
    );
    expect(follow("/docs/runtimes/custom/overview.md")).toBe(
      "/docs/runtimes/pick-a-runtime.md",
    );
    expect(follow("/docs/concepts/threads")).toBeNull();
    expect(MOVED_DOCS_REDIRECTS.every((r) => r.permanent)).toBe(true);
  });

  it("maps an old page path for lookups that skip the redirects", () => {
    expect(rewriteMovedDocsPath("docs/runtimes/concepts/threads")).toBe(
      "/docs/concepts/threads",
    );
    expect(rewriteMovedDocsPath("/docs/guides/context-api")).toBe(
      "/docs/concepts/context-api",
    );
    expect(
      rewriteMovedDocsPath("/docs/integrations/frameworks/mastra/full-stack"),
    ).toBe("/docs/runtimes/mastra");
    expect(rewriteMovedDocsPath("/docs/concepts/threads")).toBeNull();
  });
});
