import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DemoCard } from "@/components/pages/elements/demo-card";
import { SectionRail } from "@/components/pages/elements/section-rail";
import {
  ELEMENT_COUNT,
  ELEMENT_SECTIONS,
} from "@/components/pages/elements/registry";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
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
      <SectionRail
        sections={ELEMENT_SECTIONS.map((section) => ({
          id: sectionId(section.label),
          label: section.label,
        }))}
      />
      <header className="max-w-xl">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight">
          Elements
        </p>
        <h1 className={cn("mt-4", typePage)}>
          Every state an assistant can be in.
        </h1>
        <p className="text-foreground/55 mt-4 max-w-md text-[15px] leading-relaxed">
          {ELEMENT_COUNT} interface pieces for AI products: reasoning, tool
          calls, approvals, artifacts, and the composer itself. Every demo is
          live; open any element for its source.
        </p>
      </header>

      <div className="mt-20 flex flex-col gap-20 md:mt-24">
        {ELEMENT_SECTIONS.map((section, sectionIndex) => (
          <section
            key={section.label}
            id={sectionId(section.label)}
            className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-sm font-medium">{section.label}</h2>
              <span className="text-foreground/35 ms-auto font-mono text-[11px] tracking-tight tabular-nums">
                {section.elements.length} elements
              </span>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-14 md:grid-cols-2">
              {section.elements.map((element) => {
                runningIndex += 1;
                return (
                  <DemoCard
                    key={element.slug}
                    href={`/elements/${element.slug}`}
                    index={runningIndex}
                    title={element.title}
                    description={element.description}
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
    </PageFrame>
  );
}
