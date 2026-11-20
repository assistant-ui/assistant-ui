import type { Metadata } from "next";
import {
  BlockCard,
  UpcomingBlockCard,
} from "@/components/pages/blocks/block-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { BLOCKS, UPCOMING_BLOCKS } from "@/lib/blocks";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Blocks";
const description =
  "Working agent apps built with assistant-ui. Try each one, read its files, and see what it needs to run.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function BlocksPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Agent apps you can take apart.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Each block is a working app built with assistant-ui. Open one to try
          it, read its files, and see what it needs to run.
        </p>
      </header>

      <div className="border-foreground/10 mt-16 grid gap-x-8 gap-y-12 border-t pt-10 sm:grid-cols-2 md:mt-20 md:pt-12 lg:grid-cols-3">
        {BLOCKS.map((block, index) => (
          <BlockCard key={block.slug} index={index + 1} {...block} />
        ))}
        {UPCOMING_BLOCKS.map((block, index) => (
          <UpcomingBlockCard
            key={block.slug}
            index={BLOCKS.length + index + 1}
            title={block.title}
            description={block.description}
            stack={block.stack}
          />
        ))}
      </div>
    </PageFrame>
  );
}
