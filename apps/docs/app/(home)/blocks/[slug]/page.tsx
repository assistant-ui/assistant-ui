import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  blockAssistantUi,
  blockDependencies,
  readBlockSource,
} from "@/components/pages/blocks/block-source";
import { Dependencies } from "@/components/pages/blocks/dependencies";
import {
  AssistantUi,
  Capabilities,
  EnvironmentVariables,
  Requirements,
  UseCases,
} from "@/components/pages/blocks/sections";
import { BlockViewer } from "@/components/pages/blocks/block-viewer";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { BLOCKS, getBlock } from "@/lib/blocks";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";
import docsManifest from "@/package.json";

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
  const dependencies = blockDependencies(files, docsManifest.dependencies);
  const imports = blockAssistantUi(files);

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

      <div className="mt-16 flex flex-col md:mt-20">
        <UseCases useCases={block.useCases} />
        <Capabilities capabilities={block.capabilities} />
        <AssistantUi imports={imports} />
        <Dependencies dependencies={dependencies} />
        <Requirements requirements={block.requirements} />
        {block.env && (
          <EnvironmentVariables
            env={block.env}
            example={
              files.find((file) => file.path === ".env.example")?.code ??
              block.env.variables
                .map((variable) => `${variable.name}=`)
                .join("\n")
            }
          />
        )}
      </div>
    </PageFrame>
  );
}
