import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { createOgMetadata } from "@/lib/og";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { source } from "@/lib/source";
import { getPageTreePeers } from "fumadocs-core/page-tree";
import { Card, Cards } from "fumadocs-ui/components/card";
import { TableOfContents } from "@/components/docs/table-of-contents";

function getCategoryName(slug: string[] | undefined): string {
  const firstSlug = slug?.[0];
  if (!firstSlug) return "Documentation";
  return firstSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
  const page = source.getPage(params.slug ?? []);

  if (page == null) {
    notFound();
  }

  const mdxComponents = getMDXComponents({
    DocsCategory,
  });

  const path = `apps/docs/content/docs/${page.path}`;
  const markdownUrl = `${page.url}.mdx`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;

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
    >
      <DocsBody>
        <header className="not-prose mb-8 md:mb-12">
          <p className="text-muted-foreground text-sm">
            {getCategoryName(params.slug)}
          </p>
          <h1 className="mt-2 font-medium text-3xl tracking-tight">
            {page.data.title}
          </h1>
          {page.data.description && (
            <p className="mt-3 text-lg text-muted-foreground">
              {page.data.description}
            </p>
          )}
        </header>
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
      </DocsBody>
    </DocsPage>
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

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}
