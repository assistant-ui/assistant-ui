import { describe, expect, it } from "vitest";
import {
  docsMarkdownAcceptRewrites,
  docsMarkdownFileRewrites,
  docsMarkdownVariantRewrites,
} from "./markdown-rewrites";

type RewriteCondition = {
  type: "header" | "query";
  key: string;
  value?: string;
};

type Rewrite = {
  destination: string;
  has?: RewriteCondition[];
  missing?: RewriteCondition[];
};

const resolveVariant = (query: Record<string, string | undefined>) => {
  const rewrites = docsMarkdownVariantRewrites("/docs.md", "") as Rewrite[];
  const matches = (condition: RewriteCondition) => {
    const value = query[condition.key];
    return (
      value !== undefined &&
      new RegExp(`^(?:${condition.value ?? ".*"})$`).test(value)
    );
  };

  const rewrite = rewrites.find(
    (candidate) =>
      (candidate.has ?? []).every(matches) &&
      (candidate.missing ?? []).every(
        (condition) => query[condition.key] === undefined,
      ),
  );

  return (
    rewrite?.destination.replace(":docsPlatform", query.platform ?? "") ??
    "/llms.mdx"
  );
};

describe("docsMarkdownVariantRewrites", () => {
  it("maps platform and flavor to stable internal paths", () => {
    const rewrites = docsMarkdownVariantRewrites("/docs/:path*.md", "/:path*");

    expect(rewrites.map((rewrite) => rewrite.destination)).toEqual([
      "/platform-llms.mdx/:docsPlatform/radix/:path*",
      "/platform-llms.mdx/:docsPlatform/base/:path*",
      "/platform-llms.mdx/react/radix/:path*",
    ]);
    expect(rewrites[0]?.has).toEqual([
      {
        type: "query",
        key: "platform",
        value: "(?<docsPlatform>react|rn|ink)",
      },
      { type: "query", key: "view", value: "radix-ui" },
    ]);
    expect(rewrites[2]?.missing).toEqual([{ type: "query", key: "platform" }]);
  });

  it("keeps content negotiation on every variant rewrite", () => {
    const rewrites = docsMarkdownVariantRewrites(
      "/docs/:path*",
      "/:path*",
      true,
    );

    for (const rewrite of rewrites) {
      expect(rewrite.has[0]).toEqual({
        type: "header",
        key: "accept",
        value: "(?:.*text/markdown.*)",
      });
    }
  });

  it.each([
    ["react", undefined, "/platform-llms.mdx/react/base"],
    ["react", "radix-ui", "/platform-llms.mdx/react/radix"],
    ["rn", undefined, "/platform-llms.mdx/rn/base"],
    ["rn", "radix-ui", "/platform-llms.mdx/rn/radix"],
    ["ink", undefined, "/platform-llms.mdx/ink/base"],
    ["ink", "radix-ui", "/platform-llms.mdx/ink/radix"],
  ])("maps platform %s and view %s", (platform, view, expected) => {
    expect(resolveVariant({ noise: "1", platform, view })).toBe(expected);
  });

  it("uses the default only for invalid selections", () => {
    expect(resolveVariant({ platform: "unknown", view: "radix-ui" })).toBe(
      "/llms.mdx",
    );
    expect(resolveVariant({ platform: "unknown" })).toBe("/llms.mdx");
    expect(resolveVariant({ view: "radix-ui" })).toBe(
      "/platform-llms.mdx/react/radix",
    );
  });

  it("registers every file and content-negotiated entry point", () => {
    const fileRewrites = docsMarkdownFileRewrites();
    const sources = [
      "/docs.md",
      "/docs.mdx",
      "/docs/:path*.md",
      "/docs/:path*.mdx",
    ];

    for (const source of sources) {
      expect(
        fileRewrites.filter((rewrite) => rewrite.source === source),
      ).toHaveLength(4);
    }

    const acceptRewrites = docsMarkdownAcceptRewrites();
    expect(acceptRewrites).toHaveLength(4);
    expect(
      acceptRewrites.every((rewrite) => rewrite.source === "/docs/:path*"),
    ).toBe(true);
    expect(
      acceptRewrites.every((rewrite) => rewrite.has[0]?.key === "accept"),
    ).toBe(true);
  });
});
