import { evaluate } from "@mdx-js/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { prerender } from "react-dom/static";
import { describe, expect, it, vi } from "vitest";
import rehypeCode from "@farming-labs/next/mdx-plugins/rehype-code";
import rehypeDocsCode from "./rehype-docs-code.mjs";
import { docsCodeOptions, withDocsCodeBlock } from "./docs-code";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
// Keep the test off the on-disk highlight cache.
vi.mock("node:fs/promises", () => ({
  readFile: () => Promise.reject(new Error("no cache in tests")),
  writeFile: () => Promise.resolve(),
  mkdir: () => Promise.resolve(),
}));

const SOURCE = `
Intro with \`inline code\`.

\`\`\`tsx title="app/page.tsx" {2}
export default function Page() {
  return <div className="a">hi</div>; // [!code ++]
}
\`\`\`

\`\`\`
plain fence, no language
\`\`\`

\`\`\`ts tab="One"
const one = 1;
\`\`\`

\`\`\`sh
npx assistant-ui@latest setup
\`\`\`
`;

// Stand-ins that print the props the real components receive.
const baseComponents = (): MDXComponents => ({
  pre: ({
    title,
    icon,
    children,
    ...rest
  }: ComponentProps<"pre"> & { title?: string; icon?: string }) => (
    <figure data-title={title} data-icon={icon}>
      <pre {...rest}>{children}</pre>
    </figure>
  ),
  Tab: ({ value, children }: { value: string; children: ReactNode }) => (
    <section data-tab={value}>{children}</section>
  ),
});

async function renderMdx(
  rehypePlugins: Parameters<typeof evaluate>[1]["rehypePlugins"],
  components: MDXComponents,
) {
  const { default: Content } = await evaluate(SOURCE, {
    ...runtime,
    rehypePlugins,
  });
  const { prelude } = await prerender(<Content components={components} />);
  return new Response(prelude).text();
}

describe("render-time code highlighting", () => {
  it("compiles fences to DocsCodeBlock without any highlighted spans", async () => {
    const { compile } = await import("@mdx-js/mdx");
    const out = String(
      await compile(SOURCE, { rehypePlugins: [rehypeDocsCode] }),
    );
    expect(out).toContain("DocsCodeBlock");
    expect(out).not.toContain("--shiki");
  });

  it("renders the same HTML as highlighting at compile time", async () => {
    const compileTime = await renderMdx(
      [[rehypeCode, docsCodeOptions]],
      baseComponents(),
    );
    const renderTime = await renderMdx(
      [rehypeDocsCode],
      withDocsCodeBlock(baseComponents()),
    );
    expect(compileTime).toContain("--shiki-dark");
    expect(compileTime).toContain('data-title="app/page.tsx"');
    expect(compileTime).toContain('data-tab="One"');
    expect(renderTime).toBe(compileTime);
  });
});
