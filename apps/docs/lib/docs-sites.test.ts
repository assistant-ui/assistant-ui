import { describe, expect, it } from "vitest";
import { compile, match } from "next/dist/compiled/path-to-regexp";
import {
  DOCS_SITE_REDIRECTS,
  docsSiteMarkdownFileRewrites,
  rewriteLegacyDocsSitePath,
  subProjectGithubUrl,
} from "./docs-sites";

const follow = (
  rules: ReadonlyArray<{ source: string; destination: string }>,
  path: string,
) => {
  for (const rule of rules) {
    const matched = match(rule.source, { decode: decodeURIComponent })(path);
    if (!matched) continue;
    return compile(rule.destination, { validate: false })(matched.params);
  }
  return null;
};

describe("docs sites", () => {
  it("links the playground to its route source", () => {
    expect(subProjectGithubUrl("playground")).toBe(
      "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/app/(demos)/playground",
    );
  });

  it("adds no redirects while no site has moved pages", () => {
    expect(DOCS_SITE_REDIRECTS).toEqual([]);
    expect(
      rewriteLegacyDocsSitePath("docs/utilities/safe-content-frame"),
    ).toBeNull();
    expect(
      rewriteLegacyDocsSitePath("safe-content-frame/docs/how-it-works"),
    ).toBeNull();
  });

  it("serves site markdown from the site route", () => {
    const rewrites = docsSiteMarkdownFileRewrites();
    expect(follow(rewrites, "/safe-content-frame/docs.md")).toBe(
      "/site-llms.mdx/safe-content-frame",
    );
    expect(follow(rewrites, "/safe-content-frame/docs/how-it-works.md")).toBe(
      "/site-llms.mdx/safe-content-frame/how-it-works",
    );
    expect(follow(rewrites, "/safe-content-frame/docs/how-it-works.mdx")).toBe(
      "/site-llms.mdx/safe-content-frame/how-it-works",
    );
    expect(follow(rewrites, "/docs/installation.md")).toBeNull();
  });
});
