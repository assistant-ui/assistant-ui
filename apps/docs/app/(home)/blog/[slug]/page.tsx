import type { Metadata } from "next";
import { use } from "react";
import { createOgMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blog, type BlogPage } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BlogTOC } from "@/components/pages/blog/blog-toc";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

interface Param {
  slug: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getNeighbors(slug: string, pages: BlogPage[]) {
  const posts = pages
    .filter((page) => page.data.externalUrl === undefined)
    .sort(
      (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
    );
  const index = posts.findIndex((page) => page.slugs[0] === slug);
  if (index === -1) {
    return { older: undefined, newer: undefined };
  }
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export default function Page(props: {
  params: Promise<Param>;
}): React.ReactElement {
  const params = use(props.params);
  const pages = blog.getPages() as BlogPage[];
  const page = blog.getPage([params.slug]) as BlogPage | undefined;
  const mdxComponents = getMDXComponents({});

  if (!page) notFound();

  const neighbors = getNeighbors(params.slug, pages);

  return (
    <PageFrame pad="sub">
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Blog
      </Link>

      <header className="mt-8 max-w-2xl">
        <p className="text-muted-foreground text-sm">
          {page.data.date ? (
            <time dateTime={page.data.date.toISOString()}>
              {formatDate(page.data.date)}
            </time>
          ) : null}
          {page.data.date ? (
            <span className="text-muted-foreground/40"> · </span>
          ) : null}
          {page.data.author}
        </p>
        <h1 className={cn("mt-3", typePage)}>{page.data.title}</h1>
        {page.data.description ? (
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
            {page.data.description}
          </p>
        ) : null}
      </header>

      <div className="mt-16 flex flex-col gap-16 md:mt-20 lg:flex-row lg:items-start lg:gap-16">
        <article
          data-page-content=""
          className="prose prose-blog w-full max-w-[42rem] min-w-0"
        >
          <page.data.body components={mdxComponents} />
        </article>
        <BlogTOC items={page.data.toc} />
      </div>

      <nav className="mt-24 flex items-center justify-between gap-8 md:mt-32">
        {neighbors.older ? (
          <Link
            href={neighbors.older.url}
            className="group text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className="truncate">{neighbors.older.data.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {neighbors.newer ? (
          <Link
            href={neighbors.newer.url}
            className="group text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-sm transition-colors"
          >
            <span className="truncate">{neighbors.newer.data.title}</span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </PageFrame>
  );
}

export function generateStaticParams(): Param[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}

export async function generateMetadata(props: {
  params: Promise<Param>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]) as BlogPage | undefined;

  if (!page) return { title: "Not Found" };

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}
