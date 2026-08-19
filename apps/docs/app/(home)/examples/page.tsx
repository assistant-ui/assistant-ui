import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { ExampleCard } from "@/components/examples/example-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
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

function SectionHeading({
  index,
  label,
  count,
}: {
  index: number;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className="text-sm font-medium">{label}</h2>
      <span className="text-foreground/35 ms-auto font-mono text-[11px] tracking-tight tabular-nums">
        {count}
      </span>
    </div>
  );
}

export default function ExamplesPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight">
          Examples
        </p>
        <h1 className={cn("mt-4", typePage)}>Chat UIs you can clone.</h1>
        <p className="text-foreground/55 mt-4 max-w-md text-[15px] leading-relaxed">
          Production patterns for copilots, clones, artifacts, and generative
          UI. Open any example for a preview and the source behind it.
        </p>
      </header>

      <div className="mt-20 flex flex-col gap-20 md:mt-24">
        <section
          id="official"
          className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
        >
          <SectionHeading
            index={1}
            label="Official"
            count={INTERNAL_EXAMPLES.length}
          />
          <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {INTERNAL_EXAMPLES.map((item, index) => (
              <ExampleCard key={item.title} index={index + 1} {...item} />
            ))}
          </div>
        </section>

        <section
          id="community"
          className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
        >
          <SectionHeading
            index={2}
            label="Community"
            count={COMMUNITY_EXAMPLES.length}
          />
          <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {COMMUNITY_EXAMPLES.map((item, index) => (
              <ExampleCard key={item.title} index={index + 1} {...item} />
            ))}
          </div>
        </section>
      </div>

      <p className="text-foreground/45 mt-20 text-[13px]">
        Building something of your own?{" "}
        <Link
          href="/showcase"
          className="text-foreground hover:text-foreground/70 font-medium transition-colors"
        >
          See the showcase
        </Link>
      </p>
    </PageFrame>
  );
}
