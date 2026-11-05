import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import type { TableOfContents } from "fumadocs-core/toc";
import type { StaticSource } from "fumadocs-core/source";
import type { StructuredData } from "fumadocs-core/mdx-plugins";
import type { z } from "zod";
import { contentSchemas, navigationSchema } from "../content.config";

type Collection = keyof typeof contentSchemas;

type ContentModule = {
  default: ComponentType<MDXProps>;
  toc: TableOfContents;
};

type ContentEntry = {
  path: string;
  metadata: unknown;
};

type SearchEntry = {
  structured: {
    headings: StructuredData["headings"];
    contents: { content: string; heading?: string; table?: string }[];
  };
  markdown?: string;
};

type ContentData<C extends Collection> = z.output<
  (typeof contentSchemas)[C]
> & {
  load: () => Promise<{ body: ContentModule["default"]; toc: TableOfContents }>;
  structuredData: () => Promise<StructuredData>;
  getText: (format: "processed") => Promise<string>;
};

export function createContentSource<C extends Collection>(
  collection: C,
  entries: ContentEntry[],
  metadata: { path: string; data: unknown }[],
  modules: Record<string, () => Promise<ContentModule>>,
  loadData: () => Promise<Record<string, SearchEntry>>,
): StaticSource<{
  pageData: ContentData<C>;
  metaData: z.output<typeof navigationSchema>;
}> {
  const pages = entries.map((entry) => ({
    type: "page" as const,
    path: entry.path,
    data: {
      ...(contentSchemas[collection].parse(entry.metadata) as z.output<
        (typeof contentSchemas)[C]
      >),
      async load() {
        const { default: body, toc } = await modules[entry.path]!();
        return { body, toc };
      },
      async structuredData() {
        const { structured } = (await loadData())[entry.path]!;
        return {
          ...structured,
          contents: structured.contents.map((content) => ({
            ...content,
            heading: content.heading,
          })),
        };
      },
      getText: async (_format: "processed") =>
        (await loadData())[entry.path]!.markdown ?? "",
    },
  }));
  return {
    files: [
      ...pages,
      ...metadata.map((entry) => ({
        type: "meta" as const,
        path: entry.path,
        data: navigationSchema.parse(entry.data),
      })),
    ],
  };
}
