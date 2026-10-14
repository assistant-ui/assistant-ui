import type * as PageTree from "fumadocs-core/page-tree";
import type { InferPageType, LoaderPlugin } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import {
  docs,
  docsSites,
  examples as examplePages,
  design as designPages,
  elements as elementsMdx,
  blog as blogPosts,
  careers as careersCollection,
} from "fumadocs-mdx:collections/server";
import { DOCS_SITES, type DocsSiteId } from "./docs-sites";

/**
 * Propagates `platforms` from meta.json / page frontmatter onto the page tree
 * folder/page nodes so the docs sidebar can filter sections by selected
 * platform. Without this plugin custom meta fields are dropped when the page
 * tree is built (only `description`, `icon`, etc. are mapped natively).
 */
function platformsPlugin(): LoaderPlugin {
  return {
    name: "platforms",
    transformPageTree: {
      folder(node, _folderPath, metaPath) {
        if (!metaPath) return node;
        const file = this.storage.read(metaPath);
        if (file?.format !== "meta") return node;
        const platforms = (file.data as { platforms?: string[] }).platforms;
        if (platforms) (node as { platforms?: string[] }).platforms = platforms;
        return node;
      },
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (file?.format !== "page") return node;
        const platforms = (file.data as { platforms?: string[] }).platforms;
        if (platforms) (node as { platforms?: string[] }).platforms = platforms;
        return node;
      },
    },
  };
}

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), platformsPlugin()],
});

function siteSource<F extends { path: string }>(
  all: { files: F[] },
  id: DocsSiteId,
): { files: F[] } {
  const prefix = `${id}/`;
  return {
    files: all.files
      .filter((file) => file.path.startsWith(prefix))
      .map((file) => ({ ...file, path: file.path.slice(prefix.length) })),
  };
}

function createSiteLoader(id: DocsSiteId) {
  return loader({
    baseUrl: `/${id}/docs`,
    source: siteSource(docsSites.toFumadocsSource(), id),
    plugins: [lucideIconsPlugin()],
  });
}

export type DocsSiteLoader = ReturnType<typeof createSiteLoader>;
export type DocsSitePage = InferPageType<DocsSiteLoader>;

export const docsSiteSources = Object.fromEntries(
  DOCS_SITES.map((site) => [site.id, createSiteLoader(site.id)]),
) as Record<DocsSiteId, DocsSiteLoader>;

// The docs sidebar renders only top-level folders, so a site's loose pages
// are gathered into one folder named after the site.
export function siteTree(id: DocsSiteId): PageTree.Root {
  const site = DOCS_SITES.find((entry) => entry.id === id)!;
  const tree = docsSiteSources[id].pageTree;
  const loose = tree.children.filter((node) => node.type !== "folder");
  if (loose.length === 0) return tree;
  return {
    ...tree,
    children: [
      {
        type: "folder",
        $id: `${id}:site`,
        name: site.title,
        children: loose,
      },
      ...tree.children.filter((node) => node.type === "folder"),
    ],
  };
}

export const examples = loader({
  baseUrl: "/examples",
  source: toFumadocsSource(examplePages, []),
});

export type ExamplePage = InferPageType<typeof examples>;

export const elementsDocs = loader({
  baseUrl: "/elements",
  source: toFumadocsSource(elementsMdx, []),
});

export type ElementsDocsPage = InferPageType<typeof elementsDocs>;

export const design = loader({
  baseUrl: "/design",
  source: toFumadocsSource(designPages, []),
});

export type DesignPage = InferPageType<typeof design>;

export const blog = loader({
  baseUrl: "/blog",
  source: toFumadocsSource(blogPosts, []),
});

type BaseBlogPage = InferPageType<typeof blog>;
export type BlogPage = Omit<BaseBlogPage, "data"> & {
  data: BaseBlogPage["data"] & {
    date: Date | undefined;
    author: string;
    externalUrl: string | undefined;
  };
};

export const careers = loader({
  baseUrl: "/careers",
  source: toFumadocsSource(careersCollection, []),
});

type BaseCareerPage = InferPageType<typeof careers>;
export type CareerPage = Omit<BaseCareerPage, "data"> & {
  data: BaseCareerPage["data"] & {
    location: string;
    type: string;
    salary: string;
    summary: string;
    order?: number | undefined;
  };
};
