import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { tapDocs } from "@/lib/source";
import { findNeighbour, getPageTreePeers } from "fumadocs-core/page-tree";
import { Card, Cards } from "@/components/docs/fumadocs/card";
import { TableOfContents } from "@/components/docs/layout/table-of-contents";
import { DocsPager } from "@/components/docs/layout/docs-pager";
import { DocsFooter } from "@/components/docs/layout/docs-footer";
import { createOgMetadata } from "@/lib/og";

function DocsCategory({ url }: { url?: string }) {
  const effectiveUrl = url ?? "";
  return (
    <Cards>
      {getPageTreePeers(tapDocs.pageTree, effectiveUrl).map((peer) => (
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
  const page = tapDocs.getPage(params.slug ?? []);

  if (page == null) {
    notFound();
  }

  const mdxComponents = getMDXComponents({
    DocsCategory,
  });

  const path = `apps/docs/content/tap-docs/${page.path}`;
  const markdownUrl = `${page.url}.mdx`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;

  const neighbours = findNeighbour(tapDocs.pageTree, page.url);
  const footerPrevious = neighbours.previous
    ? { name: neighbours.previous.name, url: neighbours.previous.url }
    : undefined;
  const footerNext = neighbours.next
    ? { name: neighbours.next.name, url: neighbours.next.url }
    : undefined;

  return (
    <DocsPage
      toc={page.data.toc}
      full
      tableOfContent={{
        enabled: true,
        component: (
          <TableOfContents
            items={page.data.toc}
            githubEditUrl={githubEditUrl}
            markdownUrl={markdownUrl}
          />
        ),
      }}
      tableOfContentPopover={{
        enabled: false,
      }}
      footer={{
        enabled: false,
      }}
    >
      <DocsBody>
        <header className="not-prose mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-medium text-xl tracking-tight md:text-2xl">
              {page.data.title}
            </h1>
            <DocsPager
              {...(footerPrevious && { previous: { url: footerPrevious.url } })}
              {...(footerNext && { next: { url: footerNext.url } })}
              markdownUrl={markdownUrl}
            />
          </div>
          {page.data.description && (
            <p className="mt-2 text-muted-foreground text-sm md:text-base">
              {page.data.description}
            </p>
          )}
        </header>
        <page.data.body components={mdxComponents} />
        <DocsFooter previous={footerPrevious} next={footerNext} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return tapDocs.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = tapDocs.getPage(slug);
  if (!page) return { title: "Not Found" };

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}
