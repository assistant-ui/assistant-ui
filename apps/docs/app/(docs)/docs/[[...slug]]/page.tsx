import type { Metadata } from "next";
import {
  DocsBody,
  DocsPageShell,
} from "@/components/pages/docs/layout/docs-page";
import { notFound, redirect } from "next/navigation";
import { createOgMetadata } from "@/lib/og";
import { getMDXComponents } from "@/mdx-components";
import { source } from "@/lib/source";
import { DEFAULT_PLATFORM, PLATFORM_LABELS } from "@/lib/constants";
import {
  findPathToNode,
  getPagePlatform,
} from "@/components/pages/docs/platform/tree";
import { getPageTreePeers } from "fumadocs-core/page-tree";
import { getDocsNeighbours } from "@/lib/docs-neighbours";
import { Card, Cards } from "@/components/pages/docs/fumadocs/card";
import {
  MobileTableOfContents,
  TableOfContents,
} from "@/components/pages/docs/layout/table-of-contents";
import { DocsFooter } from "@/components/pages/docs/layout/docs-footer";
import { DocsPager } from "@/components/pages/docs/layout/docs-pager";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { typePage } from "@/components/shared/type";
import Link from "next/link";

function DocsCategory({ url }: { url?: string }) {
  const effectiveUrl = url ?? "";
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, effectiveUrl).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slug = params.slug ?? [];
  const page = source.getPage(slug);

  if (page == null) {
    const overviewPage = source.getPage([...slug, "overview"]);
    if (overviewPage) redirect(overviewPage.url);

    notFound();
  }

  const { body: MdxBody, toc } = await page.data.load();
  const mdxComponents = getMDXComponents({
    DocsCategory,
  });

  const path = `apps/docs/content/docs/${page.path}`;
  const markdownUrl = `${page.url}.md`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;

  const neighbours = getDocsNeighbours(source.pageTree, page.url);
  const footerPrevious = neighbours.previous;
  const footerNext = neighbours.next;
  const pagePath =
    source.pageTree.children
      .map((node) => findPathToNode(node, page.url))
      .find(Boolean) ?? [];
  const parentFolders = pagePath.filter(
    (node) => node.type === "folder" && node.index?.url !== page.url,
  );

  return (
    <DocsPageShell toc={<TableOfContents items={toc} />}>
      <DocsBody data-page-content="">
        <header className="not-prose mb-10">
          {parentFolders.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {parentFolders.map((folder) => (
                  <li key={folder.$id} className="flex items-center gap-2">
                    {folder.type === "folder" && folder.index ? (
                      <Link
                        href={folder.index.url}
                        className="hover:text-foreground"
                      >
                        {folder.name}
                      </Link>
                    ) : (
                      <span>{folder.name}</span>
                    )}
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground/50"
                    >
                      /
                    </span>
                  </li>
                ))}
                <li aria-current="page">{page.data.title}</li>
              </ol>
            </nav>
          )}
          <div className="flex items-start justify-between gap-4">
            <h1 className={typePage}>{page.data.title}</h1>
            <DocsPager
              markdownUrl={markdownUrl}
              githubEditUrl={githubEditUrl}
              title={page.data.title}
              platformAwareMarkdown
            />
          </div>
          {page.data.description && (
            <p className="text-muted-foreground mt-3 max-w-[65ch] text-[15px] leading-relaxed">
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
        <MobileTableOfContents items={toc} />
        <MdxBody components={mdxComponents} />
        <DocsFooter previous={footerPrevious} next={footerNext} />
      </DocsBody>
    </DocsPageShell>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);
  if (!page) return { title: "Not Found" };

  const platform = getPagePlatform(source.pageTree, page.url);
  const title =
    platform === DEFAULT_PLATFORM
      ? page.data.title
      : `${page.data.title} · ${PLATFORM_LABELS[platform]}`;

  return {
    title,
    description: page.data.description,
    ...createOgMetadata(title, page.data.description),
  };
}
