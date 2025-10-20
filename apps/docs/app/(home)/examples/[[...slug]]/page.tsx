import { getExamplesPages, getExamplesPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import Link from "next/link";
import { ExamplesNavbar } from "@/components/examples";
import { INTERNAL_EXAMPLES } from "@/lib/examples";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;

  // Handle index page (no slug) - render the index.mdx file
  if (!params.slug || params.slug.length === 0) {
    const page = getExamplesPage([]);
    const mdxComponents = getMDXComponents({});

    if (page == null) {
      notFound();
    }

    return (
      <div className="examples-page">
        <DocsPage toc={page.data.toc ?? false} full={page.data.full ?? false}>
          <ExamplesNavbar />
          <DocsBody>
            <DocsRuntimeProvider>
              <page.data.body components={mdxComponents} />
            </DocsRuntimeProvider>
          </DocsBody>
        </DocsPage>
      </div>
    );
  }

  // Handle individual example pages
  const page = getExamplesPage(params.slug);
  const mdxComponents = getMDXComponents({});

  if (page == null) {
    notFound();
  }

  // Find the corresponding example to get its GitHub link
  const exampleSlug = params.slug?.join("/") || "";
  const example = INTERNAL_EXAMPLES.find(
    (ex) => ex.link === `/examples/${exampleSlug}`,
  );

  const footer = example?.githubLink ? (
    <Link
      href={example.githubLink}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "gap-1.5 text-xs",
        }),
      )}
    >
      <GithubIcon className="size-4" />
      View on GitHub
    </Link>
  ) : null;

  return (
    <div className="examples-page">
      <DocsPage
        toc={page.data.toc ?? false}
        full={page.data.full ?? false}
        tableOfContent={{ footer }}
      >
        <ExamplesNavbar />
        <DocsBody>
          <header className="mt-7 mb-28 text-center">
            <h1 className="mt-4 text-5xl font-bold">{page.data.title}</h1>
          </header>
          <DocsRuntimeProvider>
            <page.data.body components={mdxComponents} />
          </DocsRuntimeProvider>
        </DocsBody>
      </DocsPage>
    </div>
  );
}

export async function generateStaticParams() {
  // Generate params for both index and individual pages
  const pages = getExamplesPages()
    .filter((page) => page.slugs[0] === "examples")
    .map((page) => ({
      slug: page.slugs.slice(1),
    }));

  // Add the index page (empty slug)
  return [{ slug: [] }, ...pages];
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;

  // Handle index page metadata
  if (!params.slug || params.slug.length === 0) {
    const page = getExamplesPage([]);
    if (page == null) notFound();

    return {
      title: page.data.title,
      description: page.data.description ?? null,
    } satisfies Metadata;
  }

  // Handle individual example pages
  const page = getExamplesPage(params.slug);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  } satisfies Metadata;
}
