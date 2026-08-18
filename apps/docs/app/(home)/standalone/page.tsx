import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { DemoCard } from "@/components/elements/demo-card";
import { StandalonePreview } from "@/components/standalone/previews";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
import { STANDALONE_COMPONENTS, STANDALONE_COUNT } from "@/lib/standalone";
import { cn } from "@/lib/utils";

const title = "Standalone";
const description =
  "UI primitives that work anywhere. No runtime required. Open any component for a live preview and the install command.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function StandalonePage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className="text-foreground/35 font-mono text-[11px] tracking-tight">
          Standalone
        </p>
        <h1 className={cn("mt-4", typePage)}>Primitives you can drop in.</h1>
        <p className="text-foreground/55 mt-4 max-w-md text-[15px] leading-relaxed">
          {STANDALONE_COUNT} UI primitives that work anywhere in a React tree.
          No assistant-ui runtime. Open any component for a preview and the
          install command.
        </p>
      </header>

      <section className="border-foreground/10 mt-20 border-t border-dashed pt-8 md:mt-24">
        <div className="flex items-baseline gap-3">
          <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
            01
          </span>
          <h2 className="text-sm font-medium">Components</h2>
          <span className="text-foreground/35 ms-auto font-mono text-[11px] tracking-tight tabular-nums">
            {STANDALONE_COUNT}
          </span>
        </div>
        <div className="mt-8 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {STANDALONE_COMPONENTS.map((item, index) => (
            <DemoCard
              key={item.slug}
              href={`/standalone/${item.slug}`}
              index={index + 1}
              title={item.title}
              description={item.description}
              {...(item.wide ? { wide: true } : {})}
            >
              <StandalonePreview slug={item.slug} />
            </DemoCard>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
