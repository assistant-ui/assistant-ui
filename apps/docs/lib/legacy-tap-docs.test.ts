import { describe, expect, it } from "vitest";
import { compile, match } from "next/dist/compiled/path-to-regexp";
import {
  LEGACY_TAP_DOCS_REDIRECTS,
  rewriteLegacyTapDocsPath,
} from "./legacy-tap-docs";

const follow = (path: string) => {
  for (const redirect of LEGACY_TAP_DOCS_REDIRECTS) {
    const matched = match(redirect.source, { decode: decodeURIComponent })(
      path,
    );
    if (!matched) continue;
    return compile(redirect.destination, { validate: false })(matched.params);
  }
  return null;
};

describe("legacy tap docs paths", () => {
  it("maps every old page and markdown url onto the merged docs tree", () => {
    expect(follow("/tap/docs")).toBe("/docs/tap");
    expect(follow("/tap/docs/overview/introduction")).toBe("/docs/tap");
    expect(follow("/tap/docs/overview/motivation")).toBe(
      "/docs/tap/motivation",
    );
    expect(follow("/tap/docs/tap/quickstart")).toBe("/docs/tap/quickstart");
    expect(follow("/tap/docs/store/why-store")).toBe("/docs/store/why-store");
    expect(follow("/tap/docs/tap/api-reference.md")).toBe(
      "/docs/tap/api-reference.md",
    );
    expect(follow("/tap/docs/store/state.mdx")).toBe("/docs/store/state.md");
    expect(follow("/tap/docs.md")).toBe("/docs/tap.md");
    expect(follow("/docs/tap")).toBeNull();
  });

  it("aliases MCP resource paths the same way", () => {
    expect(rewriteLegacyTapDocsPath("tap/docs/store/state")).toBe(
      "/docs/store/state",
    );
    expect(rewriteLegacyTapDocsPath("/tap/docs/overview/introduction")).toBe(
      "/docs/tap",
    );
    expect(rewriteLegacyTapDocsPath("tap/docs")).toBe("/docs/tap");
    expect(rewriteLegacyTapDocsPath("docs/tap")).toBeNull();
  });

  it("marks every redirect permanent", () => {
    expect(LEGACY_TAP_DOCS_REDIRECTS.every((r) => r.permanent)).toBe(true);
  });
});
