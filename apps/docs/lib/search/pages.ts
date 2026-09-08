import { design, elementsDocs, getTapDocsPages, source } from "@/lib/source";
import type { SearchHeading, SearchRecord } from "./types";

type StructuredHeading = {
  id?: string;
  content?: string;
};

export function headingsFrom(structuredData: {
  headings?: StructuredHeading[];
}): SearchHeading[] {
  const headings: SearchHeading[] = [];
  const seen = new Set<string>();

  for (const heading of structuredData.headings ?? []) {
    const id = heading.id?.trim();
    const content = heading.content?.trim();
    if (!id || !content || seen.has(id)) continue;
    seen.add(id);
    headings.push({ id, content });
  }

  return headings;
}

export function buildSearchIndex(): Promise<SearchRecord[]> {
  return Promise.all(
    [
      ...source.getPages(),
      ...getTapDocsPages(),
      ...design.getPages(),
      ...elementsDocs.getPages(),
    ].map(async (page) => ({
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
      headings: headingsFrom(await page.data.structuredData()),
    })),
  );
}
