import Link from "next/link";
import {
  ArrowUpRight,
  Blocks,
  Bot,
  Feather,
  MessagesSquare,
  Palette,
  Plug,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { AddToCartButton } from "@/components/shared/shop-entry";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { BridgeDiagram } from "@/components/pages/docs/samples/generative-frame/diagrams";
import { GenerativeFrameDemo } from "@/components/pages/docs/samples/generative-frame/live-demo";

const ANALYTICS_PAGE = "generative-frame" as const;

const USE_CASES = [
  {
    name: "Widgets the model writes",
    copy: "Charts, diagrams, and small tools in HTML or SVG, run in a sandboxed frame.",
    api: "show_widget",
    href: "/generative-frame/docs/tools",
  },
  {
    name: "UI from your components",
    copy: "The model streams a JSON spec, and your own components render it. No model code runs.",
    api: "render_spec",
    href: "/generative-frame/docs/spec-mode",
  },
] as const;

/* Each feature maps to public API in packages/generative-frame/src. */
const FEATURES = [
  {
    title: "Streams as it’s written",
    icon: Waves,
    body: "Partial markup renders as it arrives. Scripts run once the code is complete.",
    api: "write(), end()",
  },
  {
    title: "Your theme",
    icon: Palette,
    body: "Your page’s CSS variables become tokens in the frame, and follow theme changes.",
    api: "readThemeTokens(), setTheme()",
  },
  {
    title: "MCP Apps compatible",
    icon: Plug,
    body: "The frame speaks the MCP Apps ui/* protocol, so MCP Apps widgets render too.",
    api: "ui/initialize, ui/message",
  },
  {
    title: "Screenshots and repair",
    icon: Wrench,
    body: "Errors, console output, blank renders, and a PNG go back to the model to fix.",
    api: "previewWidget(), repairLoop()",
  },
  {
    title: "Spec mode",
    icon: Blocks,
    body: "JSON patches against a catalog of your components, validated as they stream.",
    api: "defineCatalog(), <SpecRenderer>",
  },
  {
    title: "Agent delegation",
    icon: Bot,
    body: "A sub-agent writes and repairs widgets behind one generate_widget tool.",
    api: "createWidgetAgent()",
  },
  {
    title: "assistant-ui toolkit",
    icon: MessagesSquare,
    body: "Widget tool calls render in the thread while their arguments stream.",
    api: "createWidgetToolkit()",
  },
  {
    title: "Works without assistant-ui",
    icon: Feather,
    body: "The core is plain JavaScript. The React and assistant-ui entries are optional.",
    api: "createWidget()",
  },
] satisfies {
  title: string;
  icon: LucideIcon;
  body: string;
  api: string;
}[];

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

export default function GenerativeFramePage() {
  return (
    <PageFrame pad="sub" className="pt-24 md:pt-36">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className={typePage}>Widgets that stream from the model</h1>
        <p className={cn(typeDeck, "mx-auto mt-4 max-w-[54ch]")}>
          Render model-written HTML and SVG while it streams, each widget in a
          sandboxed frame on its own domain, in your app’s theme.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install generative-frame"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <AddToCartButton
            slug="generative-frame"
            name="Generative Frame"
            size="default"
            variant="outline"
          />
          <Link
            href="/generative-frame/docs"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <section className="mt-14 md:mt-20" aria-label="Live demo">
        <GenerativeFrameDemo />
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>
          Two ways to draw a widget
        </h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2">
          {USE_CASES.map((useCase) => (
            <Link
              key={useCase.name}
              href={useCase.href}
              className={cn(
                field,
                "group hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-10",
              )}
            >
              <h3 className={typeSection}>{useCase.name}</h3>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                {useCase.copy}
              </p>
              <div className="mt-6 flex items-end justify-between gap-6">
                <span className={cn(mono, "text-muted-foreground/80 text-xs")}>
                  {useCase.api}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="text-muted-foreground size-4 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>How a widget streams</h2>
        <p className={cn(typeDeck, "mx-auto mt-3 max-w-[60ch] text-center")}>
          Each widget is a{" "}
          <Link
            href="/safe-content-frame"
            className="text-foreground underline underline-offset-4"
          >
            Safe Content Frame
          </Link>{" "}
          that loads a small runtime once. Code then streams to the runtime over
          a private MessagePort.
        </p>
        <figure className="mx-auto mt-10 max-w-5xl">
          <BridgeDiagram />
          <figcaption className="text-muted-foreground mt-4 text-center text-xs">
            fig. 02 · your page, the port, and the runtime in its own frame
          </figcaption>
        </figure>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>In the package</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, ...feature }) => (
            <div key={feature.title} className={cn(field, "flex flex-col p-6")}>
              <Icon
                aria-hidden
                className="text-muted-foreground size-[18px] shrink-0"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 font-medium">{feature.title}</h3>
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
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex justify-center">
        <Link
          href="/generative-frame/docs/api-reference"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          View reference
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}
