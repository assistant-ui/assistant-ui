import type { Metadata } from "next";
import { LiveDot } from "@/components/shared/live-dot";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  ExamplePreview,
  hasExamplePreview,
} from "@/components/pages/examples/example-preview";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import {
  getExampleBySlug,
  getExampleNeighbors,
  getExampleSlug,
  getInternalExamplePages,
} from "@/lib/examples";
import { getDemo } from "@/lib/demos";
import { examples } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

const EXAMPLE_TO_DEMO_SLUG: Record<string, string> = { "ai-sdk": "base" };

export function generateStaticParams() {
  return getInternalExamplePages()
    .map((item) => getExampleSlug(item))
    .filter((slug): slug is string => slug != null)
    .map((slug) => ({ slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = examples.getPage([slug]);
  if (!page) return { title: "Not Found" };

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}

export default async function ExamplePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const page = examples.getPage([slug]);
  const item = getExampleBySlug(slug);
  if (!page || !item) notFound();

  const demo = getDemo(EXAMPLE_TO_DEMO_SLUG[slug] ?? slug);
  const neighbors = getExampleNeighbors(slug);
  const mdxComponents = getMDXComponents({});
  const preview = hasExamplePreview(slug);

  return (
    <PageFrame pad="sub">
      <Link
        href="/examples"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Examples
      </Link>

      <header className="mt-8 max-w-2xl">
        <h1 className={typePage}>{page.data.title}</h1>
        {page.data.description && (
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
            {page.data.description}
          </p>
        )}
        <p className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2 font-mono text-[13px]">
          {demo && (
            <Link
              href={`/demos/${demo.slug}`}
              className="hover:text-foreground/70 group transition-colors"
            >
              open demo
              <ArrowUpRight className="ms-1 mb-0.5 inline size-3 opacity-50 transition-opacity group-hover:opacity-100" />
            </Link>
          )}
          {item.githubLink && (
            <a
              href={item.githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground group transition-colors"
            >
              source
              <ArrowUpRight className="ms-1 mb-0.5 inline size-3 opacity-0 transition-opacity group-hover:opacity-70" />
            </a>
          )}
        </p>
      </header>

      <figure className="mt-12">
        {preview ? (
          <div className="border-foreground/10 h-[min(70vh,640px)] overflow-hidden border">
            <ExamplePreview slug={slug} />
          </div>
        ) : (
          <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative aspect-[16/10] overflow-hidden border">
            <Image
              src={item.image}
              alt={page.data.title}
              fill
              className="object-cover object-top"
            />
          </div>
        )}
        <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
          <span>fig. 01</span>
          {preview ? (
            <span className="flex items-center gap-1.5">
              <LiveDot />
              live
            </span>
          ) : (
            <span>screenshot</span>
          )}
        </figcaption>
      </figure>

      <article
        data-page-content=""
        className="prose prose-blog mt-16 max-w-none"
      >
        <page.data.body components={mdxComponents} />
      </article>

      {neighbors.previous || neighbors.next ? (
        <nav className="border-foreground/10 divide-foreground/10 mt-20 grid divide-y border-t border-b md:grid-cols-2 md:divide-x md:divide-y-0">
          {neighbors.previous ? (
            <Link
              href={neighbors.previous.link}
              className="group flex flex-col py-5 md:pe-8"
            >
              <span className={typeEyebrow}>Previous</span>
              <span className="mt-1.5 block truncate text-sm font-medium">
                {neighbors.previous.title}
              </span>
            </Link>
          ) : (
            <span className="hidden md:block" />
          )}
          {neighbors.next ? (
            <Link
              href={neighbors.next.link}
              className="group flex flex-col py-5 md:ps-8 md:text-right"
            >
              <span className={typeEyebrow}>Next</span>
              <span className="mt-1.5 block truncate text-sm font-medium">
                {neighbors.next.title}
              </span>
            </Link>
          ) : (
            <span className="hidden md:block" />
          )}
        </nav>
      ) : null}
    </PageFrame>
  );
}
