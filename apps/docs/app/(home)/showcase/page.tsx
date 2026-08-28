import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { ShowcaseCard } from "@/components/pages/showcase/showcase-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
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
      <header className="max-w-2xl">
        <h1 className={typePage}>Shipped in production.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          {SHOWCASE_COUNT} products using assistant-ui for chat, agents, and
          copilots. Open any project for the live site, the source, or a
          write-up.
        </p>
      </header>

      <div className="mt-16 flex flex-col md:mt-20">
        {SHOWCASE_SECTIONS.map((section) => (
          <section
            key={section.label}
            className="border-foreground/10 scroll-mt-24 border-t py-10 md:py-12"
          >
            <div className="flex items-baseline justify-between">
              <h2 className={typeEyebrow}>{section.label}</h2>
              <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
                {String(section.items.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item, index) => (
                <ShowcaseCard key={item.title} index={index + 1} {...item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="border-foreground/10 mt-0 border-t pt-10">
        <p className="text-muted-foreground text-sm">
          Building something of your own?{" "}
          <a
            href="mailto:showcase@assistant-ui.com"
            className="text-foreground group inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Tell us about it
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </p>
      </footer>
    </PageFrame>
  );
}
