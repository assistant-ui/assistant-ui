import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { Button } from "@/components/ui/button";
import { DemoCard } from "@/components/pages/elements/demo-card";
import {
  SectionHeader,
  SectionIndex,
} from "@/components/pages/elements/section-index";
import {
  ELEMENT_COUNT,
  ELEMENT_SECTIONS,
} from "@/components/pages/elements/registry";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
import { cn } from "@/lib/utils";

const sectionId = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

const title = "Elements";
const description = `${ELEMENT_COUNT} interface pieces for AI products: reasoning, tool calls, approvals, artifacts, and the composer itself. Every demo is live, every element ships its source.`;

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function ElementsPage() {
  let runningIndex = 0;

  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className={typeEyebrow}>Elements</p>
        <h1 className={cn("mt-4", typePage)}>
          Every state an assistant can be in.
        </h1>
        <p className={cn("mt-4", typeDeck)}>
          {ELEMENT_COUNT} interface pieces for AI products: reasoning, tool
          calls, approvals, artifacts, and the composer itself. Every demo is
          live; open any element for wiring and API.
        </p>
      </header>

      <SectionIndex
        sections={ELEMENT_SECTIONS.map((section) => ({
          id: sectionId(section.label),
          label: section.label,
          count: section.elements.length,
        }))}
      />

      <div className="mt-20 flex flex-col gap-20">
        {ELEMENT_SECTIONS.map((section, sectionIndex) => (
          <section
            key={section.label}
            id={sectionId(section.label)}
            className="border-foreground/10 scroll-mt-24 border-t pt-6"
          >
            <SectionHeader
              index={sectionIndex + 1}
              label={section.label}
              count={section.elements.length}
            />
            <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
              {section.elements.map((element) => {
                runningIndex += 1;
                return (
                  <DemoCard
                    key={element.slug}
                    href={`/elements/${element.slug}`}
                    index={runningIndex}
                    title={element.title}
                    description={element.description}
                    {...(element.connection
                      ? { connection: element.connection }
                      : {})}
                    {...(element.wide ? { wide: true } : {})}
                  >
                    <element.Component />
                  </DemoCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="border-foreground/10 mt-24 border-t pt-10">
        <p className={typeEyebrow}>Get started</p>
        <h2 className={cn("mt-2.5", typeSection)}>Wire them into a thread.</h2>
        <p className="text-muted-foreground mt-3 max-w-[40ch] text-[14px] leading-relaxed">
          Each element installs with one command; the docs connect it to a
          runtime.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Button
            nativeButton={false}
            render={<Link href="/docs">Read the docs</Link>}
          />
          <Link
            href="/design"
            className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
          >
            Design system →
          </Link>
        </div>
      </footer>
    </PageFrame>
  );
}
