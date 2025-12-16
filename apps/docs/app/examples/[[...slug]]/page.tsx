import { examples, type ExamplePage } from "@/lib/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { ExamplesNavbar } from "@/components/examples/ExamplesNavbar";
import { Footer } from "@/components/shared/footer";

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

  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{ enabled: !isIndex }}
      full={page.data.full ?? false}
      footer={{ component: <Footer /> }}
    >
      {!isIndex && <ExamplesNavbar />}
      <DocsBody>
        {!isIndex && (
          <header className="not-prose flex flex-col gap-1 pb-8">
            <h1 className="font-medium text-2xl">{page.data.title}</h1>
            {page.data.description && (
              <p className="text-muted-foreground">{page.data.description}</p>
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
  };
}
