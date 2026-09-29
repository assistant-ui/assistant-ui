import type { ContentRecord } from "./content-search";
import { searchablePages, type SearchablePage } from "./corpus";
import { headingsFrom } from "./pages";

function toRecord(page: SearchablePage): Promise<ContentRecord> {
  return Promise.resolve(page.data.structuredData()).then((structured) => {
    return {
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
      headings: headingsFrom(structured),
      contents: (structured.contents ?? [])
        .map((entry) => entry.content?.replace(/\s+/g, " ").trim() ?? "")
        .filter((text) => text.length > 0),
    };
  });
}

/**
 * The server-only search corpus. It carries each page's prose, which the
 * browser index served by `/api/search` deliberately omits so its payload
 * stays small.
 */
function collectPages(): Promise<ContentRecord[]> {
  return Promise.all(searchablePages().map(toRecord));
}

let indexPromise: Promise<ContentRecord[]> | undefined;

/**
 * The corpus, built once per server instance. A rejection is not memoized, so a
 * transient failure does not disable search for the lifetime of the process.
 */
export function buildContentIndex(): Promise<ContentRecord[]> {
  indexPromise ??= collectPages().catch((error: unknown) => {
    indexPromise = undefined;
    throw error;
  });
  return indexPromise;
}
