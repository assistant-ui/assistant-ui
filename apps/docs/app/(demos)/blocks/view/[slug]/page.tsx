import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockPreview } from "@/components/pages/blocks/block-preview";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";
import { BLOCKS, getBlock } from "@/lib/blocks";

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
    robots: { index: false },
    alternates: { canonical: block.href },
  };
}

export default async function BlockViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const block = getBlock(slug);
  if (!block) notFound();

  return (
    <main {...MAIN_CONTENT_PROPS} className="h-dvh">
      <h1 className="sr-only">{block.title}</h1>
      <BlockPreview slug={block.slug} />
    </main>
  );
}
