import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Children, isValidElement, type ReactNode } from "react";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import { DocsLayout as FrameworkLayout } from "@farming-labs/theme";
import { afterAll, describe, expect, it } from "vitest";
import { createDocsLayout } from "./next";
import { DocsHeader } from "./header";

const contentDir = mkdtempSync(join(tmpdir(), "assistant-ui-docs-"));
for (const [locale, title] of [
  ["en", "Welcome"],
  ["fr", "Bienvenue"],
] as const) {
  const directory = join(contentDir, locale);
  mkdirSync(directory);
  writeFileSync(join(directory, "page.mdx"), `---\ntitle: ${title}\n---\n`);
}
afterAll(() => rmSync(contentDir, { recursive: true }));

const getFrameworkLayout = (children: ReactNode) => {
  const layout = Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === FrameworkLayout,
  );
  expect(isValidElement<DocsLayoutProps>(layout)).toBe(true);
  if (!isValidElement<DocsLayoutProps>(layout))
    throw new Error("Missing framework layout");
  return layout;
};

describe("Farming Labs layout contract", () => {
  it("keeps the synchronous layout root and merges consumer overrides", () => {
    const banner = <div>Project language</div>;
    const tree = { name: "Project", children: [] };
    const Layout = createDocsLayout(
      { entry: "docs", contentDir },
      { name: "Project", layoutProps: { tree, sidebar: { banner } } },
    );
    const layout = getFrameworkLayout(
      Layout({ children: <p>Content</p> }).props.children,
    );
    expect(layout.props.tree).toBe(tree);
    expect(layout.props.sidebar).toMatchObject({ collapsible: false, banner });
    expect(layout.props.children).toBeDefined();
  });

  it("forwards the active locale to the framework's tree and header links", () => {
    const Layout = createDocsLayout(
      {
        entry: "docs",
        contentDir,
        i18n: { locales: ["en", "fr"], defaultLocale: "en" },
      },
      { name: "Project", locale: "fr" },
    );
    const children = Layout({ children: null }).props.children;
    const layout = getFrameworkLayout(children);
    const header = Children.toArray(children).find(
      (child) => isValidElement(child) && child.type === DocsHeader,
    );
    expect(
      isValidElement<{ docsUrl: string }>(header) && header.props.docsUrl,
    ).toBe("/docs?lang=fr");
    expect(layout.props.nav?.url).toBe("/docs?lang=fr");
    expect(layout.props.tree.children).toContainEqual(
      expect.objectContaining({ name: "Bienvenue", url: "/docs?lang=fr" }),
    );
  });
});
