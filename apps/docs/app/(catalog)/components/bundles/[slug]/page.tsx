import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Code,
  Download,
} from "lucide-react";
import { BundlePreview } from "@/components/pages/shop/bundle-preview";
import { BundleSetupButton } from "@/components/pages/shop/bundle-setup-button";
import { BundleSource } from "@/components/pages/shop/bundle-source";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import {
  EXAMPLE_BUNDLES,
  bundleHref,
  getExampleBundle,
} from "@/lib/example-bundles";
import { createOgMetadata } from "@/lib/og";
import { isExampleBundlesEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return EXAMPLE_BUNDLES.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isExampleBundlesEnabled) notFound();
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
  if (!isExampleBundlesEnabled) notFound();
  const { slug } = await params;
  const example = getExampleBundle(slug);
  if (!example) notFound();
  const files: { path: string; content: string }[] = JSON.parse(
    await readFile(
      resolve(process.cwd(), "public/example-bundles", slug, "source.json"),
      "utf8",
    ),
  );
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
          <BundleSetupButton example={example} />
          <Button
            variant="ghost"
            render={<Link href="#code" />}
            nativeButton={false}
          >
            <Code aria-hidden data-icon="inline-start" />
            Explore code
          </Button>
        </div>
      </header>
      <div className="mt-10">
        <BundlePreview slug={slug} />
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
        className="border-foreground/10 mt-12 grid gap-8 border-t pt-9 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
      >
        <div>
          <h2 id="build-heading" className={typeSection}>
            Set up this bundle.
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Your coding agent reads your project, configures the bundle, and
            connects your model provider through the setup process.
          </p>
          <div className="mt-5">
            <BundleSetupButton example={example} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium">Configure it yourself</h3>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {example.requirements}
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Download the source to inspect the components and runtime. Follow
            the guide to connect a live backend.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              render={<Link href={example.guide} />}
              nativeButton={false}
            >
              Configure it yourself
              <ArrowUpRight aria-hidden data-icon="inline-end" />
            </Button>
            <Button
              variant="ghost"
              render={<Link href="#code" />}
              nativeButton={false}
            >
              <Code aria-hidden data-icon="inline-start" />
              Explore code
            </Button>
          </div>
        </div>
      </section>
      <section
        id="code"
        aria-labelledby="code-heading"
        className="border-foreground/10 mt-12 border-t pt-9"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 id="code-heading" className={typeSection}>
            Explore the code.
          </h2>
          <Button
            variant="outline"
            render={
              <a href={`/example-bundles/${slug}/source.tar.gz`} download />
            }
            nativeButton={false}
          >
            <Download aria-hidden data-icon="inline-start" />
            Download source
          </Button>
        </div>
        <BundleSource files={files} />
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
