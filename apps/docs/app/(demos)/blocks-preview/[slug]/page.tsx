import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOCK_DEMOS } from "@/app/(home)/blocks/demos";
import { BlockThemeListener } from "@/components/pages/blocks/block-theme-listener";
import { SampleScope } from "@/components/pages/docs/samples/sample-scope";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";
import { getBlock } from "@/lib/blocks";

export function generateStaticParams() {
  return Object.keys(BLOCK_DEMOS).map((slug) => ({ slug }));
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** A demo block alone on the page, for the block viewer to frame. */
export default async function BlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Demo = BLOCK_DEMOS[slug];
  if (!Demo) notFound();

  return (
    <div className="bg-background h-dvh overflow-hidden">
      {/* The docs stylesheet sets `overflow-y: scroll` on html, which leaves a scrollbar strip inside a frame. */}
      <style>{`html { overflow: hidden; }`}</style>
      <BlockThemeListener />
      <main {...MAIN_CONTENT_PROPS} className="h-full">
        <h1 className="sr-only">{getBlock(slug)?.title ?? slug} preview</h1>
        <SampleScope>
          <Demo />
        </SampleScope>
      </main>
    </div>
  );
}
