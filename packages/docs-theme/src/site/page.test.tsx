import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { DocsPageShell } from "./page";

it("reserves the TOC column in the server HTML when the page has a TOC", () => {
  const withToc = renderToString(
    <DocsPageShell toc={<nav className="docs-toc" />}>article</DocsPageShell>,
  );
  const withoutToc = renderToString(<DocsPageShell>article</DocsPageShell>);

  expect(withToc).toMatch(/<div class="docs-layout" data-toc="">/);
  expect(withoutToc).toMatch(/<div class="docs-layout">/);
});

it("sizes the TOC column from the server-rendered marker", () => {
  const css = readFileSync(
    fileURLToPath(new URL("../../styles/site.css", import.meta.url)),
    "utf8",
  );

  expect(css).toMatch(
    /&\[data-toc\],\s*&:has\(\.docs-toc\)\s*\{\s*grid-template-columns: minmax\(0, 1fr\) 14rem;/,
  );
});
