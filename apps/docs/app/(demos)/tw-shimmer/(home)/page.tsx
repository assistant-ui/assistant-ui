"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const CODE_THEMES = {
  light: "catppuccin-latte",
  dark: "catppuccin-mocha",
} as const;

const ANALYTICS_PAGE = "tw-shimmer" as const;

const HIGHLIGHTS = [
  {
    title: "CSS only",
    description: "No JavaScript runtime. Import the plugin and add a class.",
  },
  {
    title: "Text and skeletons",
    description: "The same utilities cover labels and loading placeholders.",
  },
  {
    title: "Auto-sizing",
    description:
      "Container queries derive speed and spread from width. No measuring.",
  },
  {
    title: "Customizable",
    description: "Speed, spread, angle, color, duration, and repeat delay.",
  },
] as const;

export default function TwShimmerPage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={cn(typePage, "shimmer text-foreground/50")}>
          tw-shimmer
        </h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Zero-dependency Tailwind v4 shimmer. Text and skeletons. Pure CSS.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install tw-shimmer"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/utilities/tw-shimmer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{item.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>

      <section
        id="installation"
        className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12"
      >
        <h2 className="text-muted-foreground mb-4 text-sm md:mb-0 md:pt-1">
          Install
        </h2>
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed text-pretty">
            Add the plugin, then import it next to Tailwind.
          </p>
          <Snippet
            lang="css"
            title="app/globals.css"
            code={`@import "tailwindcss";
@import "tw-shimmer";`}
          />
        </div>
      </section>

      <DemoSection
        title="Text"
        description="The highlight is invisible on solid black or white. Use a muted or semi-transparent color."
      >
        <Example
          title="shimmer"
          description="Base utility. Needs a text color lighter or darker than the page so the sweep can show."
          code='<span class="shimmer text-foreground/60">Shimmer Effect</span>'
        >
          <span className="shimmer text-foreground/80 dark:text-foreground/60 text-xl font-medium">
            Shimmer Effect
          </span>
        </Example>

        <Example
          title="shimmer-invert"
          description="Fades the other way, so you can keep a stronger text color and still get a stark highlight."
          code='<span class="shimmer shimmer-invert text-foreground/60">Shimmer</span>'
        >
          <span className="shimmer shimmer-invert text-foreground/60 dark:text-foreground/80 text-xl font-medium">
            Shimmer Effect
          </span>
        </Example>

        <Example
          title="Automatic color"
          description="The highlight mixes from the current text color."
          code='<span class="shimmer text-blue-600">Blue Shimmer</span>'
        >
          <span className="shimmer text-xl font-medium text-blue-600">
            Blue Shimmer
          </span>
        </Example>

        <Example
          title="shimmer-color-{color}"
          description="Override the automatic highlight with any Tailwind color."
          code='<span class="shimmer shimmer-color-orange-500 text-foreground/40">Orange Shimmer</span>'
        >
          <span className="shimmer shimmer-color-orange-500 text-foreground/40 text-xl font-medium">
            Orange Shimmer
          </span>
        </Example>

        <Example
          title="shimmer-spread-{value}"
          description="Width of the highlight. Default is 120px."
          code='<span class="shimmer shimmer-spread-200 text-foreground/40">Wide Shimmer</span>'
        >
          <div className="flex flex-col items-start gap-2">
            <span className="shimmer shimmer-spread-60 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (60px)
            </span>
            <span className="shimmer shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (120px)
            </span>
            <span className="shimmer shimmer-spread-200 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (200px)
            </span>
          </div>
        </Example>

        <Example
          title="shimmer-angle-{value}"
          description="Sweep angle in degrees. Default is 15deg. Higher values cut more diagonally."
          code='<span class="shimmer shimmer-angle-75 text-foreground/40">Diagonal Shimmer</span>'
        >
          <div className="flex flex-col items-start gap-2">
            <span className="shimmer shimmer-angle-0 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (0deg)
            </span>
            <span className="shimmer shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (15deg)
            </span>
            <span className="shimmer shimmer-angle-75 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (75deg)
            </span>
          </div>
        </Example>
      </DemoSection>

      <DemoSection
        title="Timing"
        description="A cycle is the sweep plus the pause. Duration is a fixed time. Speed is pixels per second."
      >
        <Example
          title="shimmer-duration-{ms}"
          description="Fixed duration. Wider text covers more distance in the same time, so it looks faster."
          code='<span class="shimmer shimmer-duration-2000">...</span>'
        >
          <div className="flex flex-col items-start gap-2">
            <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-medium">
              Short
            </span>
            <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-medium">
              Medium Length Text
            </span>
            <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-medium">
              This Is A Much Longer Text
            </span>
          </div>
        </Example>

        <Example
          title="shimmer-speed-{px/s}"
          description="Same visual speed on every width. Default is 200px/s. CSS cannot read text width, so pass --shimmer-track-width or it defaults to 200px."
          code='<span class="shimmer shimmer-speed-200">...</span>'
        >
          <div className="flex flex-col items-start gap-2">
            <span className="shimmer shimmer-speed-200 shimmer-repeat-delay-1975 text-foreground/40 text-xl font-medium [--shimmer-track-width:50px]">
              Short
            </span>
            <span className="shimmer shimmer-speed-200 shimmer-repeat-delay-1300 text-foreground/40 text-xl font-medium [--shimmer-track-width:185px]">
              Medium Length Text
            </span>
            <span className="shimmer shimmer-speed-200 text-foreground/40 text-xl font-medium [--shimmer-track-width:245px]">
              This Is A Much Longer Text
            </span>
          </div>
        </Example>

        <Example
          title="shimmer-repeat-delay-{value}"
          description="Pause between cycles. Default is 1000ms. Use 0 for a continuous sweep."
          code='<span class="shimmer shimmer-repeat-delay-0">No Delay</span>'
        >
          <div className="flex flex-col items-start gap-2 [--shimmer-track-height:28px]">
            <span className="shimmer shimmer-repeat-delay-0 shimmer-duration-3000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (0ms)
            </span>
            <span className="shimmer shimmer-duration-3000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (1000ms)
            </span>
            <span className="shimmer shimmer-repeat-delay-2000 shimmer-duration-3000 text-foreground/40 text-xl font-medium">
              Shimmer Effect (2000ms)
            </span>
          </div>
        </Example>
      </DemoSection>

      <DemoSection
        title="Background"
        description="For skeletons, use shimmer and shimmer-bg together. Wrap a group in shimmer-container to share timing."
      >
        <Example
          title="shimmer shimmer-bg"
          description="Background sweep for a single placeholder."
          code='<div class="shimmer shimmer-bg h-4 w-64 rounded bg-muted" />'
        >
          <div className="shimmer-container">
            <div className="shimmer shimmer-bg bg-muted h-4 w-64 rounded" />
          </div>
        </Example>

        <Example
          title="shimmer-container"
          description="Auto-sizing for a group. --shimmer-x and --shimmer-y line the sweep up across the diagonal."
          code={`<div class="shimmer-container flex gap-3">
  <div class="shimmer shimmer-bg [--shimmer-x:0] [--shimmer-y:0] size-12 rounded-full bg-muted" />
  <div class="flex-1 space-y-1">
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:0] h-4 w-1/4 rounded bg-muted" />
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:20] h-4 w-full rounded bg-muted" />
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:40] h-4 w-4/5 rounded bg-muted" />
  </div>
</div>`}
        >
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">Uncoordinated</p>
              <div className="shimmer-container flex gap-3">
                <div className="shimmer shimmer-bg bg-muted size-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="shimmer shimmer-bg bg-muted h-4 w-1/4 rounded" />
                  <div className="shimmer shimmer-bg bg-muted h-4 w-full rounded" />
                  <div className="shimmer shimmer-bg bg-muted h-4 w-4/5 rounded" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                Synchronized with x/y
              </p>
              <div className="shimmer-container flex gap-3">
                <div className="shimmer shimmer-bg bg-muted size-12 shrink-0 rounded-full [--shimmer-x:0] [--shimmer-y:0]" />
                <div className="flex-1 space-y-1">
                  <div className="shimmer shimmer-bg bg-muted h-4 w-1/4 rounded [--shimmer-x:60] [--shimmer-y:0]" />
                  <div className="shimmer shimmer-bg bg-muted h-4 w-full rounded [--shimmer-x:60] [--shimmer-y:20]" />
                  <div className="shimmer shimmer-bg bg-muted h-4 w-4/5 rounded [--shimmer-x:60] [--shimmer-y:40]" />
                </div>
              </div>
            </div>
          </div>
        </Example>

        <Example
          title="shimmer-color-{color}"
          description="Override the highlight. Default is the text color at 20% alpha."
          code={`<div class="shimmer shimmer-bg shimmer-color-blue-300/30 ..." />
<div class="shimmer shimmer-bg shimmer-color-amber-200/30 ..." />`}
        >
          <div className="flex flex-col gap-6">
            <div className="shimmer-container space-y-1">
              <div className="shimmer shimmer-bg shimmer-color-blue-300/30 bg-muted h-4 w-48 rounded" />
              <div className="shimmer shimmer-bg shimmer-color-amber-200/30 bg-muted h-4 w-48 rounded" />
            </div>
            <div className="shimmer-container space-y-1">
              <div className="shimmer shimmer-bg shimmer-color-sky-300/20 dark:shimmer-color-sky-900 h-4 w-48 rounded bg-sky-200 dark:bg-sky-800" />
              <div className="shimmer shimmer-bg shimmer-color-violet-300/20 dark:shimmer-color-violet-900 h-4 w-48 rounded bg-violet-200 dark:bg-violet-800" />
            </div>
          </div>
        </Example>
      </DemoSection>

      <footer>
        <Link
          href="/docs/utilities/tw-shimmer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full API on the docs
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

function DemoSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
      <h2 className="text-muted-foreground mb-6 text-sm md:sticky md:top-20 md:mb-0 md:self-start md:pt-1">
        {title}
      </h2>
      <div className="flex flex-col gap-10">
        <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed text-pretty">
          {description}
        </p>
        <div className="flex flex-col gap-12">{children}</div>
      </div>
    </section>
  );
}

function Example({
  title,
  description,
  code,
  children,
}: {
  title: string;
  description: string;
  code: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-mono text-[15px] font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 max-w-[60ch] text-sm leading-relaxed text-pretty">
          {description}
        </p>
      </div>
      <div className="bg-muted/40 rounded-2xl px-5 py-6">{children}</div>
      <Snippet lang="html" code={code} />
    </div>
  );
}

function Snippet({
  lang,
  code,
  title,
}: {
  lang: string;
  code: string;
  title?: string;
}) {
  return (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      options={{ themes: CODE_THEMES }}
      codeblock={{
        ...(title ? { title } : {}),
        className: "my-0",
      }}
    />
  );
}
