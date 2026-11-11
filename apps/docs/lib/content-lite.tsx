import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TableOfContents } from "fumadocs-core/toc";
import { LITE_PAGES_FILE } from "./content-lite-pages";

// `pnpm dev:lite` loads this instead of a page's MDX until the page is opened.
// Opening it records the page in LITE_PAGES_FILE; the dev server's manifest
// watcher then swaps in the real import and the placeholder refreshes.
// The file access is synchronous so prerendering does not treat it as
// uncached data.
function recordPage(page: string) {
  const file = resolve(process.cwd(), LITE_PAGES_FILE);
  let source = "[]";
  try {
    source = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let pages: string[] = [];
  try {
    const parsed: unknown = JSON.parse(source);
    if (Array.isArray(parsed))
      pages = parsed.filter((entry) => typeof entry === "string");
  } catch {
    // A corrupt list only costs recompiling the pages it named.
  }
  if (pages.includes(page)) return;
  writeFileSync(file, `${JSON.stringify([...pages, page].sort())}\n`);
}

// Routes such as /llms-full.txt load every page body at once. Recording those
// would compile the whole site again, so a burst of placeholder loads only
// gets placeholders. A person opens one page at a time.
const BURST_WINDOW_MS = 2000;
const BURST_PAGES = 3;
const recentLoads: number[] = [];

function isBulkLoad() {
  const now = Date.now();
  while (recentLoads.length && now - recentLoads[0]! > BURST_WINDOW_MS)
    recentLoads.shift();
  recentLoads.push(now);
  return recentLoads.length > BURST_PAGES;
}

export function pendingPage(collection: string, path: string) {
  if (!isBulkLoad()) recordPage(`${collection}/${path}`);
  return {
    // A full reload, not a client component: the regenerated manifest swaps
    // modules under the current render, and a client reference can vanish.
    default: () => (
      <>
        <meta httpEquiv="refresh" content="2" />
        <p className="text-muted-foreground text-sm">
          Compiling this page (lite mode). It loads in a few seconds.
        </p>
      </>
    ),
    toc: [] as TableOfContents,
  };
}
