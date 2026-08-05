import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DemoCard } from "@/components/elements/demo-card";
import {
  ELEMENT_COUNT,
  ELEMENT_SECTIONS,
} from "@/components/elements/registry";

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
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-32 md:pt-32">
      <header className="max-w-xl">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight">
          Elements
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight text-balance md:text-4xl">
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
            className="border-foreground/10 border-t border-dashed pt-8"
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
    </main>
  );
}
