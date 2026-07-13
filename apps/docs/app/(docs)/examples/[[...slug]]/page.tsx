import { examples, type ExamplePage } from "@/lib/source";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { ExamplesNavbar } from "@/components/docs/examples-navbar";
import { DocsFooter } from "@/components/docs/layout/docs-footer";
import { DocsPager } from "@/components/docs/layout/docs-pager";
import { findNeighbour } from "fumadocs-core/page-tree";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/radix/button";
import { getDemo } from "@/lib/demos";

// The AI SDK example renders the Base demo component.
const EXAMPLE_TO_DEMO_SLUG: Record<string, string> = { "ai-sdk": "base" };

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

  const exampleSlug = params.slug?.[0];
  const demo = exampleSlug
    ? getDemo(EXAMPLE_TO_DEMO_SLUG[exampleSlug] ?? exampleSlug)
    : undefined;

  const markdownUrl = `${page.url}.md`;

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
        enabled: false,
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
              <h1 className="text-xl font-medium tracking-tight md:text-2xl">
                {page.data.title}
              </h1>
              <div className="flex items-center gap-2">
                {demo && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/demos/${demo.slug}`}>
                      Open demo
                      <ArrowUpRightIcon className="size-3.5" />
                    </Link>
                  </Button>
                )}
                <DocsPager
                  {...(footerPrevious && {
                    previous: { url: footerPrevious.url },
                  })}
                  {...(footerNext && { next: { url: footerNext.url } })}
                  markdownUrl={markdownUrl}
                />
              </div>
            </div>
            {page.data.description && (
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
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
