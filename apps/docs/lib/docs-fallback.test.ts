import { describe, expect, it } from "vitest";
import { compile, match } from "next/dist/compiled/path-to-regexp";
import { docsMarkdownRedirect, docsOverviewPage } from "./docs-fallback";
import { MOVED_DOCS_REDIRECTS } from "./moved-docs";

const PAGES = new Set([
  "/docs/runtimes/ag-ui/overview",
  "/docs/concepts/threads",
  "/docs/installation",
]);
const loader = {
  getPage: (slug: string[]) => {
    const url = ["/docs", ...slug].join("/");
    return PAGES.has(url) ? { url } : undefined;
  },
};

const follow = (url: string) => {
  for (const redirect of MOVED_DOCS_REDIRECTS) {
    const matched = match(redirect.source, { decode: decodeURIComponent })(url);
    if (!matched) continue;
    return compile(redirect.destination, { validate: false })(matched.params);
  }
  return null;
};

describe("docsOverviewPage", () => {
  it("opens a folder's overview page", () => {
    expect(docsOverviewPage(loader, ["runtimes", "ag-ui"])).toEqual({
      url: "/docs/runtimes/ag-ui/overview",
    });
    expect(docsOverviewPage(loader, ["runtimes", "nope"])).toBeUndefined();
  });
});

describe("docsMarkdownRedirect", () => {
  it("sends a folder's markdown to its overview's markdown", () => {
    expect(docsMarkdownRedirect(loader, ["runtimes", "ag-ui"])).toEqual({
      url: "/docs/runtimes/ag-ui/overview.md",
      permanent: false,
    });
  });

  it("sends a moved page's markdown to the markdown of where it lives now", () => {
    expect(
      docsMarkdownRedirect(loader, ["runtimes", "concepts", "threads"]),
    ).toEqual({ url: "/docs/concepts/threads.md", permanent: true });
  });

  it("drops the section anchor of a page that became a section", () => {
    expect(docsMarkdownRedirect(loader, ["runtimes", "custom"])).toEqual({
      url: "/docs/runtimes/pick-a-runtime.md",
      permanent: true,
    });
  });

  it("keeps the platform and view the reader asked for", () => {
    expect(
      docsMarkdownRedirect(
        loader,
        ["runtimes", "ag-ui"],
        "platform=react-native&view=radix-ui",
      )?.url,
    ).toBe(
      "/docs/runtimes/ag-ui/overview.md?platform=react-native&view=radix-ui",
    );
  });

  it("leaves a path with no page and no move to the 404", () => {
    expect(docsMarkdownRedirect(loader, ["nope"])).toBeNull();
  });
});

describe("moved docs markdown", () => {
  it.each([
    ["/docs/ui/thread.md", "/elements/thread.md"],
    ["/docs/ui/tabs.mdx", "/design/components/tabs.md"],
    ["/docs/cloud/telemetry.md", "/docs/cloud/run-reports.md"],
    ["/docs/guides/tool-ui.md", "/docs/tools/tool-ui.md"],
    [
      "/docs/runtimes/custom/local.md",
      "/docs/runtimes/custom/local-runtime.md",
    ],
    ["/docs/getting-started.md", "/docs/installation.md"],
  ])("redirects %s to %s", (from, to) => {
    expect(follow(from)).toBe(to);
  });

  it("still redirects the html pages that moved out of next.config", () => {
    expect(follow("/docs/ui/thread")).toBe("/elements/thread");
    expect(follow("/docs/ui")).toBe("/elements");
    expect(follow("/docs/runtimes/ai-sdk/v6")).toBe(
      "/docs/runtimes/ai-sdk/v6-legacy",
    );
  });
});
