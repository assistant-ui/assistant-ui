import type { Metadata } from "next";
import type * as PageTree from "fumadocs-core/page-tree";
import { getPageTreePeers } from "fumadocs-core/page-tree";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  DocsBody,
  DocsPageShell,
} from "@/components/pages/docs/layout/docs-page";
import { createOgMetadata } from "@/lib/og";
import { getMDXComponents } from "@/mdx-components";
import type { DocsSiteLoader, source } from "@/lib/source";
import { DEFAULT_PLATFORM, PLATFORM_LABELS } from "@/lib/constants";
import { getPagePlatform } from "@/components/pages/docs/platform/tree";
import { getDocsNeighbours } from "@/lib/docs-neighbours";
import { Card, Cards } from "@/components/pages/docs/fumadocs/card";
import { TableOfContents } from "@/components/pages/docs/layout/table-of-contents";
import { DocsFooter } from "@/components/pages/docs/layout/docs-footer";
import { DocsPager } from "@/components/pages/docs/layout/docs-pager";
import { Badge } from "@/components/ui/badge";

export type DocsRouteLoader = typeof source | DocsSiteLoader;

export type DocsRouteOptions = {
  loader: DocsRouteLoader;
  tree: PageTree.Root;
  // Repository directory the pages live in, for the edit link.
  contentDir: string;
  // Main docs pages vary by the reader's platform; a sub-project site does not.
  platformAware: boolean;
  // Where a slug with no page of its own should go instead of a 404.
  fallbackUrl: (slug: string[]) => string | undefined;
};

function firstPageUrl(nodes: readonly PageTree.Node[]): string | undefined {
  for (const node of nodes) {
    if (node.type === "page") return node.url;
    if (node.type !== "folder") continue;
    if (node.index) return node.index.url;
    const nested = firstPageUrl(node.children);
    if (nested) return nested;
  }
  return undefined;
}

export function overviewFallback(loader: DocsRouteLoader) {
  return (slug: string[]) => loader.getPage([...slug, "overview"])?.url;
}

export function firstPageFallback(tree: PageTree.Root) {
  return (slug: string[]) =>
    slug.length === 0 ? firstPageUrl(tree.children) : undefined;
}

export async function DocsRoutePage({
  slug,
  loader,
  tree,
  contentDir,
  platformAware,
  fallbackUrl,
}: DocsRouteOptions & { slug: string[] }) {
  const page = loader.getPage(slug);

  if (page == null) {
    const fallback = fallbackUrl(slug);
    if (fallback) redirect(fallback);

    notFound();
  }

  const { body: MdxBody, toc } = await page.data.load();
  const mdxComponents = getMDXComponents({
    DocsCategory: ({ url }: { url?: string }) => (
      <Cards>
        {getPageTreePeers(tree, url ?? "").map((peer) => (
          <Card key={peer.url} title={peer.name} href={peer.url}>
            {peer.description}
          </Card>
        ))}
      </Cards>
    ),
  });

  const markdownUrl = `${page.url}.md`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${contentDir}/${page.path}`;

  const neighbours = getDocsNeighbours(tree, page.url);
  const footerPrevious = neighbours.previous;
  const footerNext = neighbours.next;

  return (
    <DocsPageShell
      toc={
        <TableOfContents
          items={toc}
          githubEditUrl={githubEditUrl}
          markdownUrl={markdownUrl}
          platformAwareMarkdown={platformAware}
        />
      }
    >
      <DocsBody data-page-content="">
        <header className="not-prose mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-medium tracking-tight md:text-2xl">
              {page.data.title}
            </h1>
            <DocsPager
              {...(footerPrevious && { previous: { url: footerPrevious.url } })}
              {...(footerNext && { next: { url: footerNext.url } })}
              markdownUrl={markdownUrl}
              title={page.data.title}
              platformAwareMarkdown={platformAware}
            />
          </div>
          {page.data.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
              {page.data.description}
            </p>
          )}
          {page.data.links && page.data.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {page.data.links.map((link) => (
                <Badge
                  key={link.url}
                  variant="secondary"
                  render={
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  {link.label}
                  <ArrowUpRight />
                </Badge>
              ))}
            </div>
          )}
        </header>
        <MdxBody components={mdxComponents} />
        <DocsFooter previous={footerPrevious} next={footerNext} />
      </DocsBody>
    </DocsPageShell>
  );
}

export function docsRouteMetadata({
  slug,
  loader,
  tree,
  platformAware,
  siteTitle,
}: Pick<DocsRouteOptions, "loader" | "tree" | "platformAware"> & {
  slug: string[];
  // Names the docs site in the title of each of its pages.
  siteTitle?: string;
}): Metadata {
  const page = loader.getPage(slug);
  if (!page) return { title: "Not Found" };

  const platform = platformAware
    ? getPagePlatform(tree, page.url)
    : DEFAULT_PLATFORM;
  const title =
    platform !== DEFAULT_PLATFORM
      ? `${page.data.title} · ${PLATFORM_LABELS[platform]}`
      : siteTitle
        ? `${page.data.title} · ${siteTitle}`
        : page.data.title;

  return {
    title,
    description: page.data.description,
    ...createOgMetadata(title, page.data.description),
  };
}
