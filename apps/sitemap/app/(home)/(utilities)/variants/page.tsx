import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";
import { VARIANTS_SETUP_PROMPT } from "@/components/shared/variants-setup-prompt";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";
import { highlightElementSource } from "@/lib/element-source";
import { VariantsBrowserFrame } from "./browser-frame";
import { Typed } from "./typed";

const { title, description } = subProject("variants");

export const metadata: Metadata = { title, description };

const USAGE = `// The Method group from the demo above
<Variants id="variants-demo-method" label="Method" default="side-by-side">
  <Variant id="side-by-side" label="Side by side"><MethodSideBySide /></Variant>
  <Variant id="stacked" label="Stacked"><MethodStacked /></Variant>
  <Variant id="cards" label="Step cards"><MethodStepCards /></Variant>
</Variants>`;

const SKILL_SETUP = `npm install -D @assistant-ui/variants
mkdir -p .claude/skills
ln -s ../../node_modules/@assistant-ui/variants/skills/variants .claude/skills/variants`;

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
    <PageFrame pad="sub">
      <PageHero
        title="Pick designs in your app."
        deck={
          <>
            Type <Typed>/variants</Typed> and your coding agent adds design
            options to your running app. Keep the one you like.
          </>
        }
        primary={{
          label: "Read the docs",
          href: subProjectGithubUrl("variants"),
        }}
        secondary={{ install: "npm install -D @assistant-ui/variants" }}
        showcase={
          <DemoSetupPanel
            demo={<VariantsBrowserFrame />}
            demoCaption="A recipe page after /variants improve my recipe page. Switch the options in the sidebar."
            files={[
              { path: "prompt", language: "text", code: VARIANTS_SETUP_PROMPT },
              { path: "terminal", language: "bash", code: SKILL_SETUP },
            ]}
            setupCaption="The installation prompt for your coding agent, or the README's steps for Claude Code."
            frameClassName="h-[40rem] [&_pre]:whitespace-pre-wrap"
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <h2 className="text-sm font-medium">How it works</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            <Typed>@assistant-ui/variants</Typed> renders the options your agent
            writes.
          </p>
          <div
            className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document mt-6 max-w-3xl min-w-0 overflow-x-auto px-6 py-5 font-mono text-[12px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: usage }}
          />
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FACTS.map((fact) => (
              <li key={fact.title}>
                <p className="text-sm font-medium">{fact.title}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                  {fact.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageFrame>
  );
}
