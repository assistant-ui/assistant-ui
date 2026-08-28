import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { ExampleCard } from "@/components/pages/examples/example-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { COMMUNITY_EXAMPLES, INTERNAL_EXAMPLES } from "@/lib/examples";
import { cn } from "@/lib/utils";

const title = "Examples";
const description =
  "Production-ready examples of AI chat in React. ChatGPT clones, copilots, generative UI, artifacts, and more, all built with assistant-ui.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function ExampleSection({
  id,
  label,
  items,
}: {
  id: string;
  label: string;
  items: typeof INTERNAL_EXAMPLES;
}) {
  return (
    <section
      id={id}
      className="border-foreground/10 scroll-mt-24 border-t py-10 md:py-12"
    >
      <div className="flex items-baseline justify-between">
        <h2 className={typeEyebrow}>{label}</h2>
        <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
          {String(items.length).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <ExampleCard key={item.title} index={index + 1} {...item} />
        ))}
      </div>
    </section>
  );
}

export default function ExamplesPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Chat UIs you can clone.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Production patterns for copilots, clones, artifacts, and generative
          UI. Open any example for a preview and the source behind it.
        </p>
      </header>

      <div className="mt-16 flex flex-col md:mt-20">
        <ExampleSection
          id="official"
          label="Official"
          items={INTERNAL_EXAMPLES}
        />
        <ExampleSection
          id="community"
          label="Community"
          items={COMMUNITY_EXAMPLES}
        />
      </div>

      <footer className="border-foreground/10 border-t pt-10">
        <p className="text-muted-foreground text-sm">
          Building something of your own?{" "}
          <Link
            href="/showcase"
            className="text-foreground group inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            See the showcase
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </p>
      </footer>
    </PageFrame>
  );
}
