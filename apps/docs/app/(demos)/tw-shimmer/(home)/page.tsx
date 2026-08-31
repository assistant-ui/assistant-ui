import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

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
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={cn(typePage, "shimmer text-foreground/50")}>
          Loading, pure CSS.
          <span className="shimmer-clone" aria-hidden="true" inert>
            Loading, pure CSS.
          </span>
        </h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Zero-dependency shimmer for Tailwind CSS v4. Sine-eased gradients,
          OKLCH color mixing, text and skeletons, pure CSS.
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

      <figure className="mt-12 md:mt-16">
        <div className="border-foreground/10 border px-6 py-8 md:px-10 md:py-10">
          <div className="shimmer-container mx-auto flex max-w-md flex-col gap-6">
            <div className="shimmer shimmer-bg bg-muted h-9 w-44 self-end rounded-[16px] [--shimmer-x:240] [--shimmer-y:0]" />
            <div className="flex flex-col gap-2">
              <div className="shimmer shimmer-bg bg-muted h-4 w-full rounded [--shimmer-x:0] [--shimmer-y:50]" />
              <div className="shimmer shimmer-bg bg-muted h-4 w-11/12 rounded [--shimmer-x:0] [--shimmer-y:74]" />
              <div className="shimmer shimmer-bg bg-muted h-4 w-3/5 rounded [--shimmer-x:0] [--shimmer-y:98]" />
            </div>
            <p className="shimmer text-foreground/45 font-mono text-[12px] tracking-wide">
              &gt; thinking
              <span className="shimmer-clone" aria-hidden="true" inert>
                &gt; thinking
              </span>
            </p>
          </div>
        </div>
        <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
          <span>fig. 01</span>
          <span>what loading looks like in assistant-ui</span>
        </figcaption>
      </figure>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:py-12">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="lg:px-8 lg:first:ps-0 lg:last:pe-0"
            >
              <h2 className="text-sm font-medium">{item.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <DemoSection
          id="installation"
          title="Install"
          description="Add the plugin, then import it next to Tailwind."
        >
          <Snippet
            lang="css"
            title="app/globals.css"
            code={`@import "tailwindcss";
@import "tw-shimmer";`}
          />
        </DemoSection>

        <DemoSection
          title="Text"
          description="The highlight is invisible on solid black or white. Use a muted or semi-transparent color."
        >
          <Example
            title="shimmer"
            description="The default compositor path repeats the text in a direct inert clone."
            code={shimmerCode("Shimmer Effect", "shimmer text-foreground/60")}
          >
            <ShimmerText className="text-foreground/80 dark:text-foreground/60 text-xl font-medium">
              Shimmer Effect
            </ShimmerText>
          </Example>

          <Example
            title="shimmer-invert"
            description="Fades the other way, so you can keep a stronger text color and still get a stark highlight."
            code={shimmerCode(
              "Shimmer Effect",
              "shimmer shimmer-invert text-foreground/60",
            )}
          >
            <ShimmerText className="shimmer-invert text-foreground/60 dark:text-foreground/80 text-xl font-medium">
              Shimmer Effect
            </ShimmerText>
          </Example>

          <Example
            title="Automatic color"
            description="The highlight mixes from the current text color."
            code={shimmerCode("Blue Shimmer", "shimmer text-blue-600")}
          >
            <ShimmerText className="text-xl font-medium text-blue-600">
              Blue Shimmer
            </ShimmerText>
          </Example>

          <Example
            title="shimmer-color-{color}"
            description="Override the automatic highlight with any Tailwind color."
            code={shimmerCode(
              "Orange Shimmer",
              "shimmer shimmer-color-orange-500 text-foreground/40",
            )}
          >
            <ShimmerText className="shimmer-color-orange-500 text-foreground/40 text-xl font-medium">
              Orange Shimmer
            </ShimmerText>
          </Example>

          <Example
            title="shimmer-spread-{value}"
            description="Width of the highlight. Default is 120px."
            code={shimmerCode(
              "Wide Shimmer",
              "shimmer shimmer-spread-200 text-foreground/40",
            )}
          >
            <div className="flex flex-col items-start gap-2">
              <ShimmerText className="shimmer-spread-60 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (60px)
              </ShimmerText>
              <ShimmerText className="shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (120px)
              </ShimmerText>
              <ShimmerText className="shimmer-spread-200 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (200px)
              </ShimmerText>
            </div>
          </Example>

          <Example
            title="shimmer-angle-{value}"
            description="Sweep angle in degrees. Default is 15deg. Higher values cut more diagonally."
            code={shimmerCode(
              "Diagonal Shimmer",
              "shimmer shimmer-angle-75 text-foreground/40",
            )}
          >
            <div className="flex flex-col items-start gap-2">
              <ShimmerText className="shimmer-angle-0 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (0deg)
              </ShimmerText>
              <ShimmerText className="shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (15deg)
              </ShimmerText>
              <ShimmerText className="shimmer-angle-75 shimmer-duration-5000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (75deg)
              </ShimmerText>
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
            code={shimmerCode("...", "shimmer shimmer-duration-2000")}
          >
            <div className="flex flex-col items-start gap-2">
              <ShimmerText className="shimmer-duration-2000 text-foreground/40 text-xl font-medium">
                Short
              </ShimmerText>
              <ShimmerText className="shimmer-duration-2000 text-foreground/40 text-xl font-medium">
                Medium Length Text
              </ShimmerText>
              <ShimmerText className="shimmer-duration-2000 text-foreground/40 text-xl font-medium">
                This Is A Much Longer Text
              </ShimmerText>
            </div>
          </Example>

          <Example
            title="shimmer-speed-{px/s}"
            description="Same visual speed on every width. Default is 200px/s. CSS cannot read text width, so pass --shimmer-track-width or it defaults to 200px."
            code={shimmerCode("...", "shimmer shimmer-speed-200")}
          >
            <div className="flex flex-col items-start gap-2">
              <ShimmerText className="shimmer-speed-200 shimmer-repeat-delay-1975 text-foreground/40 text-xl font-medium [--shimmer-track-width:50px]">
                Short
              </ShimmerText>
              <ShimmerText className="shimmer-speed-200 shimmer-repeat-delay-1300 text-foreground/40 text-xl font-medium [--shimmer-track-width:185px]">
                Medium Length Text
              </ShimmerText>
              <ShimmerText className="shimmer-speed-200 text-foreground/40 text-xl font-medium [--shimmer-track-width:245px]">
                This Is A Much Longer Text
              </ShimmerText>
            </div>
          </Example>

          <Example
            title="shimmer-repeat-delay-{value}"
            description="Pause between cycles. Default is 1000ms. Use 0 for a continuous sweep."
            code={shimmerCode("No Delay", "shimmer shimmer-repeat-delay-0")}
          >
            <div className="flex flex-col items-start gap-2 [--shimmer-track-height:28px]">
              <ShimmerText className="shimmer-repeat-delay-0 shimmer-duration-3000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (0ms)
              </ShimmerText>
              <ShimmerText className="shimmer-duration-3000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (1000ms)
              </ShimmerText>
              <ShimmerText className="shimmer-repeat-delay-2000 shimmer-duration-3000 text-foreground/40 text-xl font-medium">
                Shimmer Effect (2000ms)
              </ShimmerText>
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
                <p className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
                  uncoordinated
                </p>
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
                <p className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
                  synchronized with x/y
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
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The refraction sibling:{" "}
          <Link
            href="/tw-glass"
            className="text-foreground font-medium transition-colors"
          >
            tw-glass
          </Link>
          .
        </p>
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

type ShimmerTextProps = Omit<ComponentProps<"span">, "children"> & {
  children: string;
};

function ShimmerText({ children, className, ...props }: ShimmerTextProps) {
  return (
    <span {...props} className={cn("shimmer", className)}>
      {children}
      <span className="shimmer-clone" aria-hidden="true" inert>
        {children}
      </span>
    </span>
  );
}

function shimmerCode(text: string, className: string) {
  return `<span class="${className}">
  ${text}
  <span class="shimmer-clone" aria-hidden="true" inert>${text}</span>
</span>`;
}

function DemoSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-foreground/10 scroll-mt-24 border-b py-10 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-12"
    >
      <div className="mb-6 md:sticky md:top-24 md:mb-0 md:self-start">
        <h2 className={typeEyebrow}>{title}</h2>
        <p className="text-muted-foreground/70 mt-2 max-w-[22ch] text-[13px] leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-12">{children}</div>
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
        <h3 className="font-mono text-[14px] font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 max-w-[60ch] text-sm leading-relaxed text-pretty">
          {description}
        </p>
      </div>
      <div className="border-foreground/10 border px-5 py-6">{children}</div>
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
    <CodeBlock {...(title ? { title } : {})} className="my-0">
      <Highlight code={code} language={lang} />
    </CodeBlock>
  );
}
