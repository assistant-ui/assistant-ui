import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";
import type { DocumentRecord } from "fumadocs-core/search/algolia";
import { design, elementsDocs } from "@/lib/source";
import { allDocsPages } from "@/lib/docs-pages";

async function getResults() {
  "use cache";
  cacheLife("max");
  const results: DocumentRecord[] = [];

  for (const page of [
    ...allDocsPages(),
    ...design.getPages(),
    ...elementsDocs.getPages(),
  ]) {
    results.push({
      _id: page.url,
      structured: await page.data.structuredData(),
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
    });
  }

  return results;
}

export async function GET() {
  return NextResponse.json(await getResults(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
