import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { BundlePreview } from "@/components/pages/shop/bundle-preview";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import {
  EXAMPLE_BUNDLES,
  bundleHref,
  getExampleBundle,
} from "@/lib/example-bundles";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return EXAMPLE_BUNDLES.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const example = getExampleBundle(slug);
  return example
    ? {
        title: example.title,
        description: example.summary,
        ...createOgMetadata(example.title, example.summary),
      }
    : {};
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const example = getExampleBundle(slug);
  if (!example) notFound();
  const next =
    EXAMPLE_BUNDLES[
      (EXAMPLE_BUNDLES.indexOf(example) + 1) % EXAMPLE_BUNDLES.length
    ];
  return (
    <PageFrame pad="sub">
      <Link
        href="/components/bundles"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Pre-made bundles
      </Link>
      <header className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div>
          <p className="text-muted-foreground mb-3 text-sm">
            {example.useCase}
          </p>
          <h1 className={typePage}>{example.title}</h1>
          <p className={cn(typeDeck, "mt-4 max-w-[64ch]")}>
            {example.description}
          </p>
        </div>
        <div className="flex flex-col items-start justify-end gap-4">
          <a
            href={`/example-bundles/${slug}/source.tar.gz`}
            download
            className="bg-foreground text-background inline-flex items-center gap-2 rounded-(--radius-control) px-4 py-2.5 text-sm font-medium hover:opacity-85"
          >
            <Download aria-hidden className="size-4" />
            Download source
          </a>
          <Link
            href={example.guide}
            className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            Open the guide
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </header>
      <div className="mt-10">
        <BundlePreview slug={slug} title={example.title} />
      </div>
      <section
        aria-labelledby="try-heading"
        className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
      >
        <h2 id="try-heading" className={typeSection}>
          Try it in the preview.
        </h2>
        <ol className="space-y-3">
          {example.try.map((instruction, index) => (
            <li
              key={instruction}
              className="flex gap-4 text-sm leading-relaxed"
            >
              <span className="text-muted-foreground font-mono text-xs">
                {String(index + 1).padStart(2, "0")}
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby="components-heading"
        className="border-foreground/10 mt-12 border-t pt-9"
      >
        <h2 id="components-heading" className={typeSection}>
          The pieces behind the example.
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          Explore each component or integration, then adapt it in your own
          project.
        </p>
        <ul className="mt-6 grid gap-x-14 gap-y-6 md:grid-cols-2">
          {example.components.map((component) => (
            <li key={component.name}>
              <Link
                href={component.href}
                className="group flex items-center justify-between gap-4 py-2 text-sm font-medium underline-offset-4 hover:underline"
              >
                {component.name}
                <ArrowUpRight
                  aria-hidden
                  className="text-muted-foreground size-3.5"
                />
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {component.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="build-heading"
        className="border-foreground/10 mt-12 grid gap-8 border-t pt-9 md:grid-cols-2"
      >
        <div>
          <h2 id="build-heading" className={typeSection}>
            Make it your own.
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            The source archive includes this example and the shared preview
            runtime. Install dependencies, build, and serve it locally.
          </p>
          <pre className="bg-foreground/[0.025] mt-5 overflow-x-auto rounded-(--radius-document) p-4 text-sm">
            <code>{"npm install\nnpm run build\nnpm run preview"}</code>
          </pre>
        </div>
        <div>
          <h3 className="text-sm font-medium">For live AI</h3>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {example.requirements}
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Replace the local scripted transport with your server-side AI SDK
            route. The preview makes no external model calls.
          </p>
          <a
            href={example.upstreamSource}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            Related existing example
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>
      </section>
      <nav
        aria-label="Other bundles"
        className="border-foreground/10 mt-14 flex flex-wrap items-center justify-between gap-5 border-t pt-8"
      >
        <Link
          href="/components/bundles"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          All pre-made bundles
        </Link>
        {next ? (
          <Link
            href={bundleHref(next.slug)}
            className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            {next.title}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        ) : null}
      </nav>
    </PageFrame>
  );
}
