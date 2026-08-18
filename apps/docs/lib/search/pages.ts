import { getTapDocsPages, source, standalone } from "@/lib/source";
import type { SearchHeading, SearchRecord } from "./types";

type StructuredHeading = {
  id?: string;
  content?: string;
};

function headingsFrom(structuredData: {
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

export function buildSearchIndex(): SearchRecord[] {
  return [
    ...source.getPages(),
    ...getTapDocsPages(),
    ...standalone.getPages(),
  ].map((page) => ({
    url: page.url,
    title: page.data.title,
    description: page.data.description ?? "",
    headings: headingsFrom(page.data.structuredData),
  }));
}
