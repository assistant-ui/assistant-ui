import {
  design,
  elementsDocs,
  examples,
  getTapDocsPages,
  source,
} from "@/lib/source";

export type StructuredData = {
  headings?: { id?: string; content?: string }[];
  contents?: { content?: string }[];
};

export type SearchablePage = {
  url: string;
  data: {
    title: string;
    description?: string | undefined;
    structuredData: () => StructuredData | Promise<StructuredData>;
  };
};

/**
 * The single page list both search corpora index. The browser index served by
 * `/api/search` and the server-only content index behind `search_docs` derive
 * different records from it, but a page missing from one and present in the
 * other is a result that exists for agents and not for readers, or the reverse.
 */
export function searchablePages(): SearchablePage[] {
  return [
    ...source.getPages(),
    ...getTapDocsPages(),
    ...design.getPages(),
    ...elementsDocs.getPages(),
    ...examples.getPages(),
  ];
}
