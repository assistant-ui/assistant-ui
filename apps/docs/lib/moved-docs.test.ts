import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compile, match } from "next/dist/compiled/path-to-regexp";
import { MOVED_DOCS_PATHS, MOVED_DOCS_REDIRECTS } from "./moved-docs";

const CONTENT = path.resolve(__dirname, "../content/docs");

// Every /docs url a content file serves: group folders such as
// "(getting-started)" add no segment, and index.mdx serves its folder.
const pageUrls = (): Set<string> => {
  const urls = new Set<string>();
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
        urls.add(["/docs", ...parts].join("/"));
      }
    }
  };
  walk(CONTENT, []);
  return urls;
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
    expect(follow("/docs/concepts/threads")).toBeNull();
    expect(MOVED_DOCS_REDIRECTS.every((r) => r.permanent)).toBe(true);
  });
});
