import {
  design,
  elementsDocs,
  examples,
  getTapDocsPages,
  source,
} from "@/lib/source";
import type { ContentRecord } from "./content-search";
import { headingsFrom } from "./pages";

type StructuredData = {
  headings?: { id?: string; content?: string }[];
  contents?: { content?: string }[];
};

function toRecord(page: {
  url: string;
  data: {
    title: string;
    description?: string | undefined;
    structuredData: () => StructuredData | Promise<StructuredData>;
  };
}): Promise<ContentRecord> {
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
 * The server-only search corpus: every page with the prose fumadocs already
 * extracted for the browser index. The browser index served by `/api/search`
 * deliberately carries metadata alone so its payload stays small.
 */
function collectPages(): Promise<ContentRecord[]> {
  return Promise.all(
    [
      ...source.getPages(),
      ...getTapDocsPages(),
      ...design.getPages(),
      ...elementsDocs.getPages(),
      ...examples.getPages(),
    ].map((page) => toRecord(page as Parameters<typeof toRecord>[0])),
  );
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
