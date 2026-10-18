import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RootProvider } from "@farming-labs/theme";
import { afterAll, expect, it, vi } from "vitest";
import { createDocsLayout } from "./next";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/docs",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const contentDir = mkdtempSync(join(tmpdir(), "assistant-ui-docs-hosts-"));
writeFileSync(
  join(contentDir, "page.mdx"),
  "---\ntitle: Welcome\ndescription: Start here\n---\n\n## Setup\n",
);
afterAll(() => rmSync(contentDir, { recursive: true }));

it("renders the complete layout with shared framework contexts", () => {
  const Layout = createDocsLayout(
    { entry: "docs", contentDir, themeToggle: false },
    { name: "Project" },
  );
  const html = renderToStaticMarkup(
    <RootProvider>
      <Layout>
        <h2 id="setup">Setup</h2>
      </Layout>
    </RootProvider>,
  );
  expect(html).toContain('id="nd-page"');
  expect(html).toContain("fd-generated-page-header");
  expect(html).toContain('id="nd-toc-placeholder"');
  expect(html).toContain("Welcome");
});
