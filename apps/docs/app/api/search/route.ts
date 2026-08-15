import { source, getTapDocsPages } from "@/lib/source";
import { createSearchAPI } from "fumadocs-core/search/server";

export const { GET } = createSearchAPI("advanced", {
  indexes: [...source.getPages(), ...getTapDocsPages()].map((page) => ({
    title: page.data.title,
    description: page.data.description ?? "",
    structuredData: page.data.structuredData,
    id: page.url,
    url: page.url,
  })),
});
