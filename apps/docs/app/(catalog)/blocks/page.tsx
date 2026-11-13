import type { Metadata } from "next";
import { BlockInstallButton } from "@/components/pages/blocks/block-install-button";
import { BlockViewer } from "@/components/pages/blocks/block-viewer";
import { DemoCard } from "@/components/pages/elements/demo-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { loadBlockFiles } from "@/lib/block-source";
import { BLOCKS } from "@/lib/blocks";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Blocks";
const description =
  "Agent surfaces installed as source: a page, its route, and the components, hooks, and lib behind it, copied into your app with one command.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function BlocksPage() {
  const blocks = await Promise.all(
    BLOCKS.map(async (block) => ({
      block,
      files: await loadBlockFiles(block),
    })),
  );

  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <h1 className={typePage}>Agent surfaces you install as source.</h1>
        <p className={cn("mt-4", typeDeck)}>
          A block is a page, its route, and the components, hooks, and lib
          behind it. One command copies all of it into your app.
        </p>
      </header>

      <div className="border-foreground/10 mt-20 grid gap-x-6 gap-y-12 border-t pt-6 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map(({ block, files }) => (
          <DemoCard
            key={block.slug}
            href={block.href}
            index={block.index}
            title={block.title}
            description={block.description}
            wide
            canvasClassName="h-[min(80vh,720px)] p-0 md:h-[min(80vh,720px)] md:p-0"
            action={<BlockInstallButton registryName={block.registryName} />}
          >
            <BlockViewer slug={block.slug} files={files} />
          </DemoCard>
        ))}
      </div>
    </PageFrame>
  );
}
