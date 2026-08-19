import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { DemoStage } from "@/components/elements/demo-stage";
import { mono } from "@/components/elements/surfaces";
import { StandalonePreview } from "@/components/standalone/previews";
import { createOgMetadata } from "@/lib/og";
import {
  STANDALONE_COMPONENTS,
  STANDALONE_COUNT,
  getStandalone,
  getStandaloneNeighbors,
} from "@/lib/standalone";
import { standalone } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return STANDALONE_COMPONENTS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = standalone.getPage([slug]);
  const item = getStandalone(slug);
  if (!page || !item) return { title: "Not Found" };

  const title = `${page.data.title} | Standalone`;
  return {
    title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}

export default async function StandaloneDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const page = standalone.getPage([slug]);
  const item = getStandalone(slug);
  if (!page || !item) notFound();

  const neighbors = getStandaloneNeighbors(slug);
  const mdxComponents = getMDXComponents({});
  const links = page.data.links;

  return (
    <>
      <header className="mt-8 lg:mt-0">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight tabular-nums">
          {String(item.index).padStart(2, "0")} /{" "}
          {String(STANDALONE_COUNT).padStart(2, "0")}
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
          {page.data.title}
        </h1>
        {page.data.description && (
          <p className="text-foreground/55 mt-3 max-w-lg text-[15px] leading-relaxed">
            {page.data.description}
          </p>
        )}
        {links && links.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[13px]">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 transition-colors"
              >
                {link.label}
                <ArrowUpRight className="size-3.5" />
              </a>
            ))}
          </div>
        )}
      </header>

      <div
        className={cn(
          "border-foreground/10 mt-8 flex items-center justify-center overflow-hidden rounded-[24px] border p-6 md:p-10",
          item.wide ? "min-h-[320px] py-8" : "h-[400px]",
        )}
      >
        <DemoStage replay={item.slug === "number-roll"}>
          <StandalonePreview slug={item.slug} />
        </DemoStage>
      </div>

      <article data-page-content="" className="prose mt-16 max-w-none">
        <page.data.body components={mdxComponents} />
      </article>

      <nav className="border-foreground/10 mt-16 flex items-center justify-between gap-4 border-t border-dashed pt-6">
        {neighbors.previous ? (
          <Link
            href={`/standalone/${neighbors.previous.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex min-w-0 items-center gap-2 text-[13px] transition-colors"
          >
            <ArrowLeft className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(item.index - 1).padStart(2, "0")}
            </span>
            <span className="truncate">{neighbors.previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {neighbors.next ? (
          <Link
            href={`/standalone/${neighbors.next.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex min-w-0 items-center gap-2 text-[13px] transition-colors"
          >
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(item.index + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{neighbors.next.title}</span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
