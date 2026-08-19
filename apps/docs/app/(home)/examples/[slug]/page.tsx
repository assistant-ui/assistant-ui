import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  ExamplePreview,
  hasExamplePreview,
} from "@/components/examples/example-preview";
import { GitHubIcon } from "@/components/icons/github";
import { PageFrame } from "@/components/shared/page-frame";
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
        className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Examples
      </Link>

      <header className="mt-8 max-w-2xl">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
          {page.data.title}
        </h1>
        {page.data.description && (
          <p className="text-foreground/55 mt-3 text-[15px] leading-relaxed">
            {page.data.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-[13px]">
          {demo && (
            <Link
              href={`/demos/${demo.slug}`}
              className="text-foreground hover:text-foreground/70 inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              Open demo
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
          {item.githubLink && (
            <a
              href={item.githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 transition-colors"
            >
              <GitHubIcon className="size-3.5" />
              Source
            </a>
          )}
        </div>
      </header>

      {preview ? (
        <div className="border-foreground/10 mt-10 h-[min(70vh,640px)] overflow-hidden rounded-[20px] border">
          <ExamplePreview slug={slug} />
        </div>
      ) : (
        <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative mt-10 aspect-[16/10] overflow-hidden rounded-[20px] border">
          <Image
            src={item.image}
            alt={page.data.title}
            fill
            className="object-cover object-top"
          />
        </div>
      )}

      <article data-page-content="" className="prose mt-16 max-w-none">
        <page.data.body components={mdxComponents} />
      </article>

      <nav className="border-foreground/10 mt-16 flex items-center justify-between gap-4 border-t border-dashed pt-6">
        {neighbors.previous ? (
          <Link
            href={neighbors.previous.link}
            className="group text-foreground/45 hover:text-foreground/90 flex min-w-0 items-center gap-2 text-[13px] transition-colors"
          >
            <ArrowLeft className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className="truncate">{neighbors.previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {neighbors.next ? (
          <Link
            href={neighbors.next.link}
            className="group text-foreground/45 hover:text-foreground/90 flex min-w-0 items-center gap-2 text-[13px] transition-colors"
          >
            <span className="truncate">{neighbors.next.title}</span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </PageFrame>
  );
}
