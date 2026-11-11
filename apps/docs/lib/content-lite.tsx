import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TableOfContents } from "fumadocs-core/toc";
import { LitePendingPage } from "@/components/pages/docs/lite-pending-page";
import { LITE_PAGES_FILE } from "./content-lite-pages";

// `pnpm dev:lite` loads this instead of a page's MDX until the page is opened.
// Opening it records the page in LITE_PAGES_FILE; the dev server's manifest
// watcher then swaps in the real import and the placeholder refreshes.
// The file access is synchronous so prerendering does not treat it as
// uncached data.
function recordPage(page: string) {
  const file = resolve(process.cwd(), LITE_PAGES_FILE);
  let pages: string[] = [];
  try {
    pages = JSON.parse(readFileSync(file, "utf8")) as string[];
  } catch {}
  if (pages.includes(page)) return;
  writeFileSync(file, `${JSON.stringify([...pages, page].sort())}\n`);
}

export function pendingPage(collection: string, path: string) {
  recordPage(`${collection}/${path}`);
  return {
    default: () => <LitePendingPage />,
    toc: [] as TableOfContents,
  };
}
