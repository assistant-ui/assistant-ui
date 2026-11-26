import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { Highlight } from "@/components/shared/highlight";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";
import { CodeBlock } from "@/components/ui/code-block";
import { subProject } from "@/lib/docs-sites";

const { metadataTitle, description } = subProject("tw-shimmer");

export const metadata: Metadata = { title: metadataTitle, description };

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

const GLOBALS_CSS = `@import "tailwindcss";
@import "tw-shimmer";`;

const SKELETON = `export function MessageSkeleton() {
  return (
    <div className="shimmer-container flex flex-col gap-6">
      <div className="shimmer shimmer-bg bg-muted h-9 w-44 self-end rounded-[16px] [--shimmer-x:240] [--shimmer-y:0]" />
      <div className="flex flex-col gap-2">
        <div className="shimmer shimmer-bg bg-muted h-4 w-full rounded [--shimmer-x:0] [--shimmer-y:50]" />
        <div className="shimmer shimmer-bg bg-muted h-4 w-11/12 rounded [--shimmer-x:0] [--shimmer-y:74]" />
        <div className="shimmer shimmer-bg bg-muted h-4 w-3/5 rounded [--shimmer-x:0] [--shimmer-y:98]" />
      </div>
      <p className="shimmer text-foreground/45 text-xs">Thinking</p>
    </div>
  );
}`;

function LoadingSpecimen() {
  return (
    <div className="flex size-full items-center px-6 sm:px-10">
      <div className="shimmer-container mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="shimmer shimmer-bg bg-muted h-9 w-44 self-end rounded-[16px] [--shimmer-x:240] [--shimmer-y:0]" />
        <div className="flex flex-col gap-2">
          <div className="shimmer shimmer-bg bg-muted h-4 w-full rounded [--shimmer-x:0] [--shimmer-y:50]" />
          <div className="shimmer shimmer-bg bg-muted h-4 w-11/12 rounded [--shimmer-x:0] [--shimmer-y:74]" />
          <div className="shimmer shimmer-bg bg-muted h-4 w-3/5 rounded [--shimmer-x:0] [--shimmer-y:98]" />
        </div>
        <p className="shimmer text-foreground/45 text-xs">Thinking</p>
      </div>
    </div>
  );
}

export default function TwShimmerPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="Loading, pure CSS."
        deck="Zero-dependency shimmer for Tailwind CSS v4. Sine-eased gradients, OKLCH color mixing, text and skeletons, pure CSS."
        primary={{ label: "Read the docs", href: "/docs/utilities/tw-shimmer" }}
        secondary={{ install: "npm install tw-shimmer" }}
        showcase={
          <DemoSetupPanel
            demo={<LoadingSpecimen />}
            demoCaption="What loading looks like in assistant-ui."
            files={[
              { path: "app/globals.css", language: "css", code: GLOBALS_CSS },
              {
                path: "components/message-skeleton.tsx",
                language: "tsx",
                code: SKELETON,
              },
            ]}
            setupCaption="The CSS import, and the markup for the demo."
            frameClassName="h-[26rem]"
          />
        }
      />

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
            description="Uses a contrasting dark band for a stark highlight."
            code='<span class="shimmer shimmer-invert text-foreground/60">Shimmer</span>'
          >
            <span className="shimmer shimmer-invert text-foreground/60 dark:text-foreground/80 text-xl font-medium">
              Shimmer Effect
            </span>
          </Example>

          <Example
            title="Automatic color"
            titleIsCode={false}
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
                <p className="text-muted-foreground/70 text-xs">
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
                <p className="text-muted-foreground/70 text-xs">
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
    <section className="border-foreground/10 border-b py-10 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-12">
      <div className="mb-6 md:sticky md:top-24 md:mb-0 md:self-start">
        <h2 className="text-sm font-medium">{title}</h2>
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
  titleIsCode = true,
  description,
  code,
  children,
}: {
  title: string;
  titleIsCode?: boolean;
  description: string;
  code: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium">
          {titleIsCode ? <code className="font-mono">{title}</code> : title}
        </h3>
        <p className="text-muted-foreground mt-1 max-w-[60ch] text-sm leading-relaxed text-pretty">
          {description}
        </p>
      </div>
      <div className="border-foreground/10 border px-5 py-6">{children}</div>
      <CodeBlock className="my-0">
        <Highlight code={code} language="html" />
      </CodeBlock>
    </div>
  );
}
