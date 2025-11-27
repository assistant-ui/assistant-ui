import { examples, type ExamplePage } from "@/lib/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import Link from "next/link";
import { ExamplesNavbar } from "@/components/examples/ExamplesNavbar";
import { INTERNAL_EXAMPLES } from "@/lib/examples";

// Helper functions to eliminate code duplication

/**
 * Safely gets an examples page and handles null cases
 */
function getPage(slug: string[] | undefined): ExamplePage {
  const page = examples.getPage(slug);
  if (page == null) {
    notFound();
  }
  return page;
}

/**
 * Checks if the current route is the examples index page
 */
function isIndexPage(slug: string[] | undefined): boolean {
  return !slug || slug.length === 0;
}

/**
 * Generates metadata for an examples page
 */
function generatePageMetadata(page: ExamplePage): Metadata {
  return {
    title: page.data.title,
    description: page.data.description ?? null,
  } satisfies Metadata;
}

/**
 * Finds the corresponding example from INTERNAL_EXAMPLES
 */
function findExampleBySlug(slug: string[] | undefined) {
  if (!slug) return null;
  const exampleSlug = slug.join("/");
  return INTERNAL_EXAMPLES.find((ex) => ex.link === `/examples/${exampleSlug}`);
}

/**
 * Creates the GitHub footer link component
 */
function createGitHubFooter(example: ReturnType<typeof findExampleBySlug>) {
  if (!example?.githubLink) return null;

  return (
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
  );
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const mdxComponents = getMDXComponents({});
  const page = getPage(params.slug);

  if (isIndexPage(params.slug)) {
    return (
      <div className="examples-page">
        <DocsPage toc={page.data.toc ?? false} full={page.data.full ?? false}>
          <DocsBody>
            <DocsRuntimeProvider>
              <page.data.body components={mdxComponents} />
            </DocsRuntimeProvider>
          </DocsBody>
        </DocsPage>
      </div>
    );
  }

  const example = findExampleBySlug(params.slug);
  const footer = createGitHubFooter(example);

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
            <h1 className="mt-4 font-bold text-5xl">{page.data.title}</h1>
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
  const pages = examples.getPages().map((page) => ({
    slug: page.slugs,
  }));

  // Add the index page (empty slug)
  return [{ slug: [] }, ...pages];
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = getPage(params.slug);
  return generatePageMetadata(page);
}
