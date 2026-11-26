import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import "@/test/mock-content";
import {
  hasPageInAnyCase,
  kebabCaseSlug,
  missingMarkdownResponse,
  nearestPages,
} from "./docs-markdown";

const CONTENT = path.resolve(__dirname, "../content/docs");

// The real /docs pages with their titles, read from the content files: group
// folders such as "(getting-started)" add no segment, and index.mdx serves its
// folder.
const docsPages = (() => {
  const pages: { url: string; data: { title: string } }[] = [];
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
        const source = readFileSync(path.join(dir, entry.name), "utf8");
        const title = /^title:\s*["']?(.+?)["']?\s*$/m.exec(source)?.[1];
        pages.push({
          url: ["/docs", ...parts].join("/"),
          data: { title: title ?? name },
        });
      }
    }
  };
  walk(CONTENT, []);
  return pages;
})();

const nearestUrls = (pathname: string) =>
  nearestPages(pathname, docsPages, 5).map((page) => page.url);

describe("nearestPages", () => {
  // Three urls agents asked for on Nov 25 that never existed.
  it("finds the thread list pages for a guessed guide", () => {
    expect(nearestUrls("/docs/guides/thread-list.md")).toContain(
      "/docs/primitives/thread-list",
    );
  });

  it("finds the tool UI pages for an old copilots helper", () => {
    expect(nearestUrls("/docs/copilots/make-assistant-tool-ui.mdx")).toContain(
      "/docs/tools/tool-ui",
    );
  });

  it("finds a page named like the guessed one in another folder", () => {
    expect(nearestUrls("/docs/guides/reasoning.md")).toContain(
      "/docs/vue/reasoning",
    );
  });

  it("lists at most five, and nothing that shares only the folder", () => {
    expect(nearestUrls("/docs/guides/thread-list.md")).toHaveLength(5);
    expect(nearestUrls("/docs/guides/zzqx.md")).toEqual([]);
  });
});

describe("missingMarkdownResponse", () => {
  it("answers 404 in markdown with links to the nearest pages", async () => {
    const response = missingMarkdownResponse(
      "/docs/guides/keyboard-shortcuts",
      [
        { url: "/docs/guides/keyboard", data: { title: "Keyboard" } },
        { url: "/docs/cloud/billing", data: { title: "Billing" } },
      ],
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(await response.text()).toBe(
      [
        "# Page not found",
        "",
        "There is no page at `/docs/guides/keyboard-shortcuts`.",
        "",
        "Nearest pages:",
        "",
        "- [Keyboard](/docs/guides/keyboard.md)",
        "",
        "Every page is listed in [llms.txt](/llms.txt).",
        "",
      ].join("\n"),
    );
  });
});

describe("kebabCaseSlug", () => {
  it("turns an API name into its page slug", () => {
    expect(kebabCaseSlug(["primitives", "ThreadList"])).toEqual([
      "primitives",
      "thread-list",
    ]);
    expect(kebabCaseSlug(["api-reference", "primitives", "Thread"])).toEqual([
      "api-reference",
      "primitives",
      "thread",
    ]);
    expect(kebabCaseSlug(["guides", "thread_list"])).toEqual([
      "guides",
      "thread-list",
    ]);
    expect(kebabCaseSlug(["ui", "MCPServer"])).toEqual(["ui", "mcp-server"]);
  });

  it("is null for a slug that is already kebab-case", () => {
    expect(kebabCaseSlug(["primitives", "thread-list"])).toBeNull();
  });
});

describe("hasPageInAnyCase", () => {
  it("matches a slug written in another case only", () => {
    const pages = [{ slugs: ["guides", "attachments"] }];
    expect(hasPageInAnyCase(pages, ["guides", "Attachments"])).toBe(true);
    expect(hasPageInAnyCase(pages, ["guides", "attachment"])).toBe(false);
  });
});
