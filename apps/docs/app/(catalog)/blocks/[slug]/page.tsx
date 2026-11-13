import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { ShadcnInstallTabs } from "@/components/pages/docs/fumadocs/install/package-manager-tabs";
import { demoFrameClass } from "@/components/demo/utils/canvas";
import { BlockViewer } from "@/components/pages/blocks/block-viewer";
import { BlockReadme } from "@/components/pages/blocks/block-readme";
import { LiveDot } from "@/components/shared/live-dot";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { loadBlockFiles, readBlockReadme } from "@/lib/block-source";
import { BLOCKS, getBlock } from "@/lib/blocks";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return BLOCKS.map((block) => ({ slug: block.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const block = getBlock(slug);
  if (!block) return {};
  return {
    title: `${block.title} | Blocks`,
    description: block.description,
    ...createOgMetadata(block.title, block.description),
  };
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const block = getBlock(slug);
  if (!block) notFound();

  const [readme, files] = await Promise.all([
    readBlockReadme(block.slug),
    loadBlockFiles(block),
  ]);

  return (
    <PageFrame
      pad="sub"
      className="[&_article_h2]:scroll-mt-24 [&_section]:scroll-mt-24"
    >
      <Link
        href="/blocks"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeftIcon className="size-3.5" />
        Blocks
      </Link>

      <header className="mt-8">
        <h1 className={typePage}>{block.title}</h1>
        <p className={cn("mt-4 max-w-[60ch]", typeDeck)}>{block.description}</p>
      </header>

      <figure className="mt-10">
        <div
          className={cn(demoFrameClass, "h-[min(80vh,720px)] items-stretch")}
        >
          <BlockViewer slug={block.slug} files={files} />
        </div>
        <figcaption className="text-muted-foreground mt-2.5 flex items-baseline justify-between text-xs">
          <span>fig. 01</span>
          <span className="flex items-center gap-1.5">
            <LiveDot />
            live
          </span>
        </figcaption>
      </figure>

      <article className="docs-prose prose mt-12 max-w-none">
        <section id="installation">
          <h2>Installation</h2>
          <div className="mt-4">
            <ShadcnInstallTabs
              urls={[`"@assistant-ui/${block.registryName}"`]}
            />
          </div>
          <p>
            The command copies {block.files.length} files into your project and
            installs the packages and components they import.
          </p>
        </section>

        <BlockReadme markdown={readme} />
      </article>
    </PageFrame>
  );
}
