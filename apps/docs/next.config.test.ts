import { execFileSync } from "node:child_process";
import { afterAll, describe, expect, it, vi } from "vitest";
import { withAui } from "@assistant-ui/next";
import { compile, evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import type { ReactElement, ReactNode } from "react";
import type { TableOfContents } from "fumadocs-core/toc";
import { defaultShikiFactory } from "fumadocs-core/highlight/shiki/full";
import { Tab, Tabs } from "./components/pages/docs/fumadocs/tabs";
import type { PluggableList } from "unified";

vi.mock("@assistant-ui/next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/next")>();
  return { ...actual, withAui: vi.fn(actual.withAui) };
});
// Code blocks highlight in a "use cache" server function at render time.
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: () => {},
}));
vi.stubEnv("TURBOPACK", "1");
vi.stubEnv("DOCS_BUILD_CPUS", "3");
vi.stubEnv("TURBO_TASKS_AVAILABLE_PARALLELISM", undefined);
vi.stubEnv("VERCEL", undefined);
// A child process fills the manifest cache outside V8 coverage, which slows the MDX compile and measures nothing here because the config is outside the coverage include list.
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    'import { generateContentManifest } from "./scripts/content/manifest.mts"; await generateContentManifest(process.cwd());',
  ],
  { cwd: import.meta.dirname, stdio: "pipe" },
);
const { default: pending } = await import("./next.config.mts");
const config = await pending;
const auiInput = vi.mocked(withAui).mock.calls[0]?.[0];
afterAll(() => vi.unstubAllEnvs());

type Plugin = string | [string, unknown];
type MdxRule = {
  loaders: { options: { remarkPlugins: Plugin[]; rehypePlugins: Plugin[] } }[];
};
const rules = config.turbopack?.rules?.["{*,next-mdx-rule}"] as MdxRule[];
const options = rules[0]!.loaders[0]!.options;

async function plugins(values: Plugin[]): Promise<PluggableList> {
  return Promise.all(
    values.map(async (value) => {
      const [name, settings] =
        typeof value === "string" ? [value, undefined] : value;
      const plugin = await import(
        name.startsWith(".") ? new URL(name, import.meta.url).href : name
      );
      return [plugin.default, settings];
    }),
  );
}

// Code blocks render through an async server component, which only the
// streaming renderers can wait for.
async function renderToHtml(element: ReactElement): Promise<string> {
  const { prelude } = await prerender(element);
  return new Response(prelude).text();
}

describe("docs Next config composition", () => {
  it("waits for the content manifest and preserves the generative compiler", () => {
    expect(pending).toHaveProperty("then", expect.any(Function));
    expect(Object.getPrototypeOf(auiInput)).toBe(Object.prototype);
    expect(auiInput).not.toHaveProperty("then");
    expect(config.pageExtensions).toContain("mdx");
    expect(config.turbopack?.rules).toMatchObject({
      "*.tsx": { loaders: [{ loader: "@assistant-ui/next/loader" }] },
    });
  });

  it("caps the prerender workers and the Turbopack loader pool with DOCS_BUILD_CPUS", () => {
    expect(config.experimental?.cpus).toBe(3);
    expect(process.env.TURBO_TASKS_AVAILABLE_PARALLELISM).toBe("3");
  });

  it("keeps a TURBO_TASKS_AVAILABLE_PARALLELISM that is already set", async () => {
    vi.stubEnv("TURBO_TASKS_AVAILABLE_PARALLELISM", "8");
    vi.resetModules();
    const reloaded = await (await import("./next.config.mts")).default;
    expect(reloaded.experimental?.cpus).toBe(3);
    expect(process.env.TURBO_TASKS_AVAILABLE_PARALLELISM).toBe("8");
  });

  it("keeps Turbopack's build cache outside Vercel and turns it off on Vercel", async () => {
    expect(config.experimental).not.toHaveProperty(
      "turbopackFileSystemCacheForBuild",
    );
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();
    const onVercel = await (await import("./next.config.mts")).default;
    vi.stubEnv("VERCEL", undefined);
    expect(onVercel.experimental?.turbopackFileSystemCacheForBuild).toBe(false);
    expect(onVercel.experimental?.cpus).toBe(3);
  });

  it("compiles navigation anchors, highlighted code, tables and Mermaid through Farming Labs", async () => {
    const javascriptHighlighter = vi.spyOn(defaultShikiFactory, "getOrInit");
    const compiled = await evaluate(
      `---
title: Getting started
platforms: [react]
---
## Install [#setup]

| Package | Version |
| --- | --- |
| assistant-ui | latest |

\`\`\`tsx {1}
const enabled = true;
\`\`\`

\`\`\`mermaid
graph LR; A-->B;
\`\`\`
`,
      {
        ...runtime,
        remarkPlugins: await plugins(options.remarkPlugins),
        rehypePlugins: await plugins(options.rehypePlugins),
      },
    );
    expect(compiled.metadata).toMatchObject({
      title: "Getting started",
      platforms: ["react"],
    });
    expect(
      (compiled.toc as TableOfContents).map((entry) => ({
        ...entry,
        title: renderToStaticMarkup(entry.title),
      })),
    ).toEqual([{ title: "Install", url: "#setup", depth: 2 }]);
    const { withDocsCodeBlock } = await import("./lib/docs-code");
    const html = await renderToHtml(
      createElement(compiled.default, {
        components: withDocsCodeBlock({
          MermaidDiagram: ({ children }: { children?: ReactNode }) =>
            createElement("figure", null, children),
        }),
      }),
    );
    expect(html).toContain('id="setup"');
    expect(html).toContain("<table>");
    expect(html).toContain("data-line-numbers");
    expect(html).toContain("highlighted");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("<figure>graph LR; A--&gt;B;</figure>");
    expect(javascriptHighlighter).not.toHaveBeenCalled();
    // The page module carries the code as data, not highlighted spans.
    const module = String(
      await compile("```tsx\nconst enabled = true;\n```", {
        rehypePlugins: await plugins(options.rehypePlugins),
      }),
    );
    expect(module).toContain("DocsCodeBlock");
    expect(module).not.toContain("--shiki");
  });

  it("keeps provider code tabs selectable and local images imported for optimization", async () => {
    const remarkPlugins = await plugins(options.remarkPlugins);
    const rehypePlugins = await plugins(options.rehypePlugins);
    const source =
      '<Tabs items={["OpenAI", "Anthropic"]}>\n\n```ts tab="OpenAI"\nconst provider = "openai";\n```\n\n```ts tab="Anthropic"\nconst provider = "anthropic";\n```\n\n</Tabs>';
    const compiled = await evaluate(source, {
      ...runtime,
      remarkPlugins,
      rehypePlugins,
    });
    const { withDocsCodeBlock } = await import("./lib/docs-code");
    const html = await renderToHtml(
      createElement(compiled.default, {
        components: withDocsCodeBlock({ Tabs, Tab }),
      }),
    );
    expect(html).toContain('role="tab" aria-selected="true"');
    expect(html).toContain('role="tabpanel" data-state="active"');
    expect(html).toContain('role="tabpanel" data-state="inactive" hidden=""');
    expect(html).toContain("OpenAI");
    expect(html).toContain("Anthropic");
    const image = await compile(
      {
        value: "![Dashboard](../images/overview.webp)",
        path: new URL(
          "./content/docs/cloud/dashboard/index.mdx",
          import.meta.url,
        ).pathname,
      },
      { remarkPlugins, rehypePlugins },
    );
    expect(String(image)).toMatch(
      /import .* from ["']\.\.\/images\/overview\.webp["']/,
    );
    expect(String(image)).toContain('alt: "Dashboard"');
  });
});
