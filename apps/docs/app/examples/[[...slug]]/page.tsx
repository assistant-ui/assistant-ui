import { examples, type ExamplePage } from "@/lib/source";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { ExamplesNavbar } from "@/components/docs/examples-navbar";
import { TableOfContents } from "@/components/docs/layout/table-of-contents";
import { DocsFooter } from "@/components/docs/layout/docs-footer";
import { DocsPager } from "@/components/docs/layout/docs-pager";
import { findNeighbour } from "fumadocs-core/page-tree";

function getPage(slug: string[] | undefined): ExamplePage {
  const page = examples.getPage(slug);
  if (page == null) {
    notFound();
  }
  return page;
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const mdxComponents = getMDXComponents({});
  const page = getPage(params.slug);
  const isIndex = !params.slug || params.slug.length === 0;

  const path = `apps/docs/content/examples/${page.path}`;
  const markdownUrl = `${page.url}.mdx`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;

  const neighbours = findNeighbour(examples.pageTree, page.url);
  const footerPrevious = neighbours.previous
    ? { name: neighbours.previous.name, url: neighbours.previous.url }
    : undefined;
  const footerNext = neighbours.next
    ? { name: neighbours.next.name, url: neighbours.next.url }
    : undefined;

  return (
    <DocsPage
      toc={page.data.toc}
      full={true}
      tableOfContent={{
        enabled: !isIndex,
        component: !isIndex ? (
          <TableOfContents
            items={page.data.toc}
            githubEditUrl={githubEditUrl}
            markdownUrl={markdownUrl}
          />
        ) : undefined,
      }}
      tableOfContentPopover={{
        enabled: false,
      }}
      footer={{
        enabled: false,
      }}
    >
      {!isIndex && <ExamplesNavbar />}
      <DocsBody>
        {!isIndex && (
          <header className="not-prose mb-8">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-medium text-xl tracking-tight md:text-2xl">
                {page.data.title}
              </h1>
              <DocsPager
                {...(footerPrevious && {
                  previous: { url: footerPrevious.url },
                })}
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
        )}
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
        {!isIndex && <DocsFooter previous={footerPrevious} next={footerNext} />}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const pages = examples.getPages().map((page) => ({
    slug: page.slugs,
  }));

  return [{ slug: [] }, ...pages];
}

export async function generateMetadata(
  props: PageProps<"/examples/[[...slug]]">,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = getPage(slug);

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}
