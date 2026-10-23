import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/diagrammatic/figure";
import { FormWall } from "@/components/diagrammatic/wall";
import { examples as lineExamples } from "@/components/diagrammatic/demos/line";

const ANALYTICS_PAGE = "diagrammatic" as const;

const FEATURES = [
  {
    title: "Rendered on the server",
    body: "Every form is a pure function that returns SVG. No hooks and no browser APIs, so it renders in a Server Component as is.",
    api: 'import { Line } from "diagrammatic"',
    href: "/diagrammatic/docs/quickstart",
  },
  {
    title: "Drawn in CSS pixels",
    body: "A figure renders at its width and inherits the page font, so its 11px tick labels are the same 11px as your captions.",
    api: "width, aspect, fontSize, <Fit>",
    href: "/diagrammatic/docs/sizing",
  },
  {
    title: "Themed by tokens",
    body: "Seven validated categorical hues, a diverging pair, and ink are CSS variables. A shadcn/ui app imports one stylesheet.",
    api: "--dg-*, diagrammatic/shadcn.css",
    href: "/diagrammatic/docs/theming",
  },
  {
    title: "Interaction on the wrapper",
    body: "Tooltips, hover highlight, clicks, and zoom live in one client entry that wraps server charts and reads the marks they stamp.",
    api: "diagrammatic/interactive",
    href: "/diagrammatic/docs/interaction",
  },
  {
    title: "Charts a model can write",
    body: "A serializable spec covers the forms in the main entry. Validate the model's JSON and one component draws it.",
    api: "validateSpec(), <Chart spec>",
    href: "/diagrammatic/docs/ai-specs",
  },
  {
    title: "Geography in its own entry",
    body: "A world map and a dot world map ship separately, so only the pages that draw a map load its geometry.",
    api: "diagrammatic/world",
    href: "/diagrammatic/docs/charts/world-map",
  },
] as const;

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

export default function DiagrammaticPage() {
  const flagship = lineExamples[0]!;

  return (
    <PageFrame pad="sub" className="pt-24 md:pt-36">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className={typePage}>Every chart, drawn on the server</h1>
        <p className={cn(typeDeck, "mx-auto mt-4 max-w-[54ch]")}>
          Sixty-six chart forms for React. Server-rendered SVG with zero
          dependencies, sized in CSS pixels, and themed by CSS tokens.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install diagrammatic"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/diagrammatic/docs"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-14 max-w-3xl md:mt-20" aria-label="Figure">
        <Figure n={1} caption={flagship.title} className="sm:py-12">
          {flagship.chart}
          {flagship.source && (
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              Illustrative data. {flagship.source}
            </p>
          )}
        </Figure>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>In the package</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className={cn(
                field,
                "group hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4",
              )}
            >
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-muted-foreground mt-1 flex-1 text-sm leading-relaxed">
                {feature.body}
              </p>
              <p
                className={cn(
                  mono,
                  "text-muted-foreground/80 mt-5 text-xs break-words",
                )}
              >
                {feature.api}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={typeSection}>
            Every form, by the question it answers
          </h2>
          <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
            Each plate is the form drawn at a small width. Open one to read its
            full figure, the case it was built for, and its props.
          </p>
        </div>
        <div className="mt-12 md:mt-16">
          <FormWall />
        </div>
      </section>

      <footer className="mx-auto mt-32 max-w-5xl">
        <div className="divide-foreground/10 border-foreground/10 grid border-y md:grid-cols-3 md:divide-x">
          {[
            {
              title: "Quickstart",
              body: "Install, draw a chart, add a tooltip.",
              href: "/diagrammatic/docs/quickstart",
            },
            {
              title: "Charts from a model",
              body: "Validate a spec and draw it in a thread.",
              href: "/diagrammatic/docs/ai-specs",
            },
            {
              title: "Coming from Recharts",
              body: "Map a Recharts dashboard onto the forms.",
              href: "/diagrammatic/docs/migrating-from-recharts",
            },
          ].map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group hover:bg-foreground/[0.025] flex items-start justify-between gap-4 px-6 py-6 transition-colors"
            >
              <span>
                <span className="block font-medium">{path.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {path.body}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </footer>
    </PageFrame>
  );
}
