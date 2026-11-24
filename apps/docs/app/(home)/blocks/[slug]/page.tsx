import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  blockElements,
  readBlockSource,
} from "@/components/pages/blocks/block-source";
import { BlockElements } from "@/components/pages/blocks/sections";
import { BlockViewer } from "@/components/pages/blocks/block-viewer";
import { ELEMENTS } from "@/components/pages/elements/registry";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { BLOCKS, getBlock } from "@/lib/blocks";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return BLOCKS.map((block) => ({ slug: block.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const block = getBlock(slug);
  if (!block) return { title: "Not Found" };

  return {
    title: block.title,
    description: block.description,
    ...createOgMetadata(block.title, block.description),
  };
}

export default async function BlockPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const block = getBlock(slug);
  if (!block) notFound();

  const files = await readBlockSource(block.source);
  const bySlug = new Map(ELEMENTS.map((element) => [element.slug, element]));
  const elements = blockElements(files, ELEMENTS).flatMap((match) => {
    const element = bySlug.get(match.slug);
    return element ? [{ ...element, ...match }] : [];
  });

  return (
    <PageFrame pad="sub">
      <Link
        href="/blocks"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Blocks
      </Link>

      <header className="mt-8 max-w-2xl">
        <h1 className={typePage}>{block.title}</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>{block.description}</p>
        <p className="mt-6 text-[13px]">
          <a
            href={block.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground group transition-colors"
          >
            source
            <ArrowUpRight className="ms-1 mb-0.5 inline size-3 opacity-0 transition-opacity group-hover:opacity-70" />
          </a>
        </p>
      </header>

      <div className="mt-10">
        <BlockViewer
          slug={block.slug}
          title={block.title}
          previewUrl={block.previewUrl}
          image={block.image}
          files={files}
          entry={block.source.entry}
        />
      </div>

      {elements.length > 0 && (
        <div className="mt-16 md:mt-20">
          <BlockElements elements={elements} />
        </div>
      )}
    </PageFrame>
  );
}
