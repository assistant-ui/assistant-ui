import { NextResponse } from "next/server";
import type { DocumentRecord } from "fumadocs-core/search/algolia";
import { design, source, getTapDocsPages, standalone } from "@/lib/source";

export const revalidate = false;

export function GET() {
  const results: DocumentRecord[] = [];

  for (const page of [
    ...source.getPages(),
    ...getTapDocsPages(),
    ...design.getPages(),
    ...standalone.getPages(),
  ]) {
    results.push({
      _id: page.url,
      structured: page.data.structuredData,
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
    });
  }

  return NextResponse.json(results, {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
