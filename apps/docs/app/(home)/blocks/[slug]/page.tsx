import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  blockDependencies,
  readBlockSource,
} from "@/components/pages/blocks/block-source";
import { BlockViewer } from "@/components/pages/blocks/block-viewer";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  Definition,
  DefinitionAnnotation,
  DefinitionDetails,
  DefinitionList,
  DefinitionName,
  DefinitionTerm,
} from "@/components/ui/definition-list";
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

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className="border-foreground/10 grid scroll-mt-24 gap-x-12 gap-y-5 border-t py-10 md:grid-cols-[14rem_minmax(0,1fr)] md:py-12"
    >
      <h2 id={`${id}-label`} className="text-sm font-medium">
        {label}
      </h2>
      <div className="max-w-2xl min-w-0">{children}</div>
    </section>
  );
}

const sectionList =
  "text-muted-foreground flex flex-col gap-3 text-[15px] leading-relaxed";

export default async function BlockPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const block = getBlock(slug);
  if (!block) notFound();

  const files = await readBlockSource(block.source);
  const dependencies = blockDependencies(files);

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
          title={block.title}
          previewUrl={block.previewUrl}
          image={block.image}
          files={files}
          entry={block.source.entry}
        />
      </div>

      <div className="mt-16 flex flex-col md:mt-20">
        <Section id="problem-solved" label="Problem solved">
          <p className="text-[15px] leading-relaxed">{block.problem}</p>
        </Section>

        <Section id="use-cases" label="Use cases">
          <ul className={sectionList}>
            {block.useCases.map((useCase) => (
              <li key={useCase}>{useCase}</li>
            ))}
          </ul>
        </Section>

        <Section id="capabilities" label="Capabilities">
          <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {block.capabilities.map((capability) => (
              <div key={capability.title}>
                <dt className="text-sm font-medium">{capability.title}</dt>
                <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {capability.description}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="dependencies" label="Dependencies">
          <ul className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {dependencies.map((dependency) => (
              <li
                key={dependency.name}
                className="flex items-baseline justify-between gap-4 font-mono [font-variant-ligatures:none]"
              >
                <span className="min-w-0 truncate text-[13px]">
                  {dependency.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {dependency.range}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
            Read from the block&apos;s package.json. A package at workspace:* is
            built from this repository.
          </p>
        </Section>

        <Section id="requirements" label="Requirements">
          <ul className={sectionList}>
            {block.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </Section>

        <Section id="environment-variables" label="Environment variables">
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {block.env.note}
          </p>
          <DefinitionList>
            {block.env.variables.map((variable) => (
              <Definition key={variable.name}>
                <DefinitionTerm>
                  <DefinitionName>{variable.name}</DefinitionName>
                  <DefinitionAnnotation>
                    {variable.required ? "required" : "optional"}
                  </DefinitionAnnotation>
                </DefinitionTerm>
                <DefinitionDetails>{variable.description}</DefinitionDetails>
              </Definition>
            ))}
          </DefinitionList>
        </Section>
      </div>
    </PageFrame>
  );
}
