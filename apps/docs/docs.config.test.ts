import { describe, expect, it, vi } from "vitest";
import { loadFarmDocsMdxCompileOptions } from "@farming-labs/farmjs/vite";
import { compile, evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TableOfContents } from "fumadocs-core/toc";
import { defaultShikiFactory } from "fumadocs-core/highlight/shiki/full";
import { Tab, Tabs } from "./components/pages/docs/fumadocs/tabs";
import docsConfig from "./docs.config";

const options = await loadFarmDocsMdxCompileOptions(
  import.meta.dirname,
  docsConfig.mdx,
);

describe("docs MDX pipeline", () => {
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
      { ...runtime, ...options },
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
    const html = renderToStaticMarkup(
      createElement(compiled.default, {
        components: {
          MermaidDiagram: ({ children }) =>
            createElement("figure", null, children),
        },
      }),
    );
    expect(html).toContain('id="setup"');
    expect(html).toContain("<table>");
    expect(html).toContain("data-line-numbers");
    expect(html).toContain("highlighted");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("<figure>graph LR; A--&gt;B;</figure>");
    expect(javascriptHighlighter).not.toHaveBeenCalled();
  });

  it("keeps provider code tabs selectable and local images imported for optimization", async () => {
    const source =
      '<Tabs items={["OpenAI", "Anthropic"]}>\n\n```ts tab="OpenAI"\nconst provider = "openai";\n```\n\n```ts tab="Anthropic"\nconst provider = "anthropic";\n```\n\n</Tabs>';
    const compiled = await evaluate(source, { ...runtime, ...options });
    const html = renderToStaticMarkup(
      createElement(compiled.default, { components: { Tabs, Tab } }),
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
      options,
    );
    expect(String(image)).toMatch(
      /import .* from ["']\.\.\/images\/overview\.webp["']/,
    );
    expect(String(image)).toContain('alt: "Dashboard"');
  });
});
