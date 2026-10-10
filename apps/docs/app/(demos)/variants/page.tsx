import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { highlightElementSource } from "@/lib/element-source";
import { VariantsBrowserFrame } from "./browser-frame";
import { InstallationPrompt } from "./copy-prompt";
import { Typed } from "./typed";

const USAGE = `// The Plans group from the demo above
<Variants id="variants-demo-plans" label="Plans" default="cards">
  <Variant id="cards" label="Three cards"><PlanCards /></Variant>
  <Variant id="table" label="Comparison table"><PlanTable /></Variant>
  <Variant id="featured" label="One featured plan"><PlanFeatured /></Variant>
</Variants>`;

const FACTS: { title: string; description: ReactNode }[] = [
  {
    title: "In the page, not a mockup.",
    description: "Options render with your real data and breakpoints.",
  },
  {
    title: "Shareable picks.",
    description: (
      <>
        A <Typed>?variant=</Typed> link reproduces what you see.
      </>
    ),
  },
  {
    title: "Notes for the agent.",
    description: (
      <>
        <Kbd
          aria-label="Option"
          className="h-5 min-w-5 rounded-sm font-sans text-xs font-medium"
        >
          ⌥
        </Kbd>
        -click to leave a note that travels with your pick.
      </>
    ),
  },
  {
    title: "No wrapper element.",
    description: "Your layout and selectors see exactly what ships.",
  },
  {
    title: "Refused in production.",
    description: (
      <>
        A production build won&apos;t render an undecided{" "}
        <Typed>{"<Variants>"}</Typed>.
      </>
    ),
  },
];

export default async function VariantsPage() {
  const usage = await highlightElementSource(USAGE);
  return (
    <PageFrame pad="sub" className="flex flex-col gap-28 md:gap-40">
      <header className="max-w-2xl pt-8 md:pt-16">
        <h1 className={typePage}>Pick designs in your app.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Type <Typed>/variants</Typed> and your coding agent adds design
          options to your running app. Keep the one you like.
        </p>
        <div className="mt-8">
          <InstallationPrompt section="hero" />
        </div>
      </header>

      <VariantsBrowserFrame />

      <section className="flex max-w-3xl flex-col gap-4">
        <h2 className={typeSection}>How it works</h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          <Typed>@assistant-ui/variants</Typed> renders the options your agent
          writes.
        </p>
        <div
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document mt-4 min-w-0 overflow-x-auto px-6 py-5 font-mono text-[12px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
          dangerouslySetInnerHTML={{ __html: usage }}
        />
        <ul className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex flex-col gap-4 px-6 py-7 md:px-8 md:py-8">
          {FACTS.map((fact) => (
            <li
              key={fact.title}
              className="text-[15px] leading-relaxed font-medium text-pretty"
            >
              {fact.title}{" "}
              <span className="text-muted-foreground font-normal">
                {fact.description}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex max-w-3xl flex-col items-start gap-8 pb-8">
        <h2 className={typeSection}>Set it up today.</h2>
        <InstallationPrompt section="closer" />
      </section>
    </PageFrame>
  );
}
