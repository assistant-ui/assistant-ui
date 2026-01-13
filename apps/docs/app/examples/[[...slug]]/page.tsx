import { examples, type ExamplePage } from "@/lib/source";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { ExamplesNavbar } from "@/components/examples/ExamplesNavbar";
import { TableOfContents } from "@/components/docs/table-of-contents";

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
    >
      {!isIndex && <ExamplesNavbar />}
      <DocsBody>
        {!isIndex && (
          <header className="not-prose mb-8 md:mb-12">
            <h1 className="font-medium text-3xl tracking-tight">
              {page.data.title}
            </h1>
            {page.data.description && (
              <p className="mt-3 text-lg text-muted-foreground">
                {page.data.description}
              </p>
            )}
          </header>
        )}
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
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
