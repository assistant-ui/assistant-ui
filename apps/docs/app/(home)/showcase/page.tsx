import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { ShowcaseCard } from "@/components/pages/showcase/showcase-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
import { SHOWCASE_COUNT, SHOWCASE_SECTIONS } from "@/lib/showcase";
import { cn } from "@/lib/utils";

const title = "Showcase";
const description =
  "Projects built with assistant-ui. Open any product for the live site, the source, or a write-up.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function ShowcasePage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight">
          Showcase
        </p>
        <h1 className={cn("mt-4", typePage)}>Shipped in production.</h1>
        <p className="text-foreground/55 mt-4 max-w-md text-[15px] leading-relaxed">
          {SHOWCASE_COUNT} products using assistant-ui for chat, agents, and
          copilots. Open any project for the live site, the source, or a
          write-up.
        </p>
      </header>

      <div className="mt-20 flex flex-col gap-20 md:mt-24">
        {SHOWCASE_SECTIONS.map((section, sectionIndex) => (
          <section
            key={section.label}
            className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-sm font-medium">{section.label}</h2>
              <span className="text-foreground/35 ms-auto font-mono text-[11px] tracking-tight tabular-nums">
                {section.items.length}
              </span>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item, index) => (
                <ShowcaseCard key={item.title} index={index + 1} {...item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-foreground/45 mt-20 text-[13px]">
        Building something of your own?{" "}
        <a
          href="mailto:showcase@assistant-ui.com"
          className="text-foreground hover:text-foreground/70 font-medium transition-colors"
        >
          Tell us about it
        </a>
      </p>
    </PageFrame>
  );
}
