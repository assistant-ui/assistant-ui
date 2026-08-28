import type { Metadata } from "next";
import { use } from "react";
import { createOgMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blog, type BlogPage } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { ArrowLeft } from "lucide-react";
import { BlogTOC } from "@/components/pages/blog/blog-toc";
import { GlyphPlate } from "@/components/shared/glyph-scene";
import { sceneFor } from "@/components/pages/blog/scenes";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
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
  const ordered = [...pages].sort(
    (a, b) => (a.data.date?.getTime() ?? 0) - (b.data.date?.getTime() ?? 0),
  );
  const fig = ordered.findIndex((post) => post.slugs[0] === params.slug) + 1;
  const scene = sceneFor(params.slug);

  return (
    <PageFrame pad="sub">
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Blog
      </Link>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <header className="max-w-2xl">
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
        <figure className="mt-10 lg:mt-1">
          <GlyphPlate scene={scene} />
          <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
            <span>fig. {String(fig).padStart(2, "0")}</span>
            <span>{scene.name}</span>
          </figcaption>
        </figure>
      </div>

      <div className="border-foreground/10 mt-12 border-t pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <article
          data-page-content=""
          className="prose prose-blog w-full max-w-[42rem] min-w-0"
        >
          <page.data.body components={mdxComponents} />
        </article>
        <BlogTOC items={page.data.toc} />
      </div>

      {neighbors.older || neighbors.newer ? (
        <nav className="border-foreground/10 divide-foreground/10 mt-24 grid divide-y border-t border-b md:grid-cols-2 md:divide-x md:divide-y-0">
          {neighbors.older ? (
            <NeighborCell post={neighbors.older} direction="older" />
          ) : (
            <span className="hidden md:block" />
          )}
          {neighbors.newer ? (
            <NeighborCell post={neighbors.newer} direction="newer" />
          ) : (
            <span className="hidden md:block" />
          )}
        </nav>
      ) : null}
    </PageFrame>
  );
}

function NeighborCell({
  post,
  direction,
}: {
  post: BlogPage;
  direction: "older" | "newer";
}) {
  const scene = sceneFor(post.slugs[0]!);
  return (
    <Link
      href={post.url}
      className={cn(
        "group flex items-center gap-5 py-6",
        direction === "older" ? "md:pe-8" : "md:flex-row-reverse md:ps-8",
      )}
    >
      <GlyphPlate scene={scene} fit className="w-24 shrink-0" />
      <span className={cn("min-w-0", direction === "newer" && "md:text-right")}>
        <span className={typeEyebrow}>
          {direction === "older" ? "Older" : "Newer"}
        </span>
        <span className="mt-1.5 block truncate text-sm font-medium">
          {post.data.title}
        </span>
      </span>
    </Link>
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
