import { getPages } from "@/app/source";
import { createSearchAPI } from "fumadocs-core/search/server";

export const { GET } = createSearchAPI("advanced", {
  indexes: getPages().map((page) => ({
    title: (page.data as any).title,
    structuredData: (page.data as any).exports.structuredData,
    id: page.url,
    url: page.url,
  })),
});
