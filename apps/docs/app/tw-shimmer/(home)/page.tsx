"use client";

import { useState, useCallback } from "react";
import { Copy, Check, FileCode, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
} from "@shikijs/transformers";

const HIGHLIGHT_STYLES = `
  .highlighted {
    background: rgba(59, 130, 246, 0.15);
    display: block;
  }
  .dark .highlighted {
    background: rgba(147, 197, 253, 0.25);
  }
  .highlighted-word {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(30, 58, 138);
    padding: 0 0.125rem;
    border-radius: 0.125rem;
    font-style: normal;
    font-weight: inherit;
  }
  .dark .highlighted-word {
    background: rgba(147, 197, 253, 0.3);
    color: rgb(165, 180, 252);
  }
`;

function HighlightStyles() {
  return (
    <style jsx global>
      {HIGHLIGHT_STYLES}
    </style>
  );
}

export default function TwShimmerPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  return (
    <div className="container mx-auto max-w-7xl space-y-16 px-4 py-12">
      <HighlightStyles />
      <div className="mx-auto flex w-fit flex-col items-center space-y-6 text-center">
        <div className="bg-border flex cursor-default rounded-full p-px">
          <div className="bg-background flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
            <Sparkle className="size-4 opacity-50" />
            <span className="text-foreground/60">Tailwind CSS v4 Plugin</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="pointer-events-none text-5xl font-bold tracking-tight select-none lg:text-7xl">
            <h1 className="shimmer text-foreground/50 inline">tw-shimmer</h1>
          </div>

          <p className="text-muted-foreground max-w-[520px] text-lg font-light text-balance">
            Zero-dependency CSS-only shimmer. Simple, beautiful, and
            lightweight.
          </p>
        </div>
      </div>

      <div id="installation" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-medium">Installation</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxContent>
              <div className="flex items-center justify-between">
                <code className="text-sm">npm install tw-shimmer</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard("npm install tw-shimmer")}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxCodeHeader fileName="styles/globals.css" />
            <BoxCode>
              <CodeBlock
                language="css"
                code={`@import "tailwindcss";
@import "tw-shimmer";`}
                highlight="tw-shimmer"
                highlightMode="line"
              />
            </BoxCode>
          </Box>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-medium">Text Shimmer</h2>
          <p className="text-muted-foreground text-xl">
            Add shimmer effects to text elements.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="border border-dashed border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            <p className="mb-1 font-semibold">💡 Important</p>
            <p className="text-muted-foreground">
              You won&apos;t see the shimmer if your text color is{" "}
              <span className="dark:hidden">black</span>
              <span className="hidden dark:inline">white</span>. Set a{" "}
              <span className="dark:hidden">lighter</span>
              <span className="hidden dark:inline">darker</span> or
              semi-transparent text color.
            </p>
          </div>

          <Box>
            <BoxTitle
              title="shimmer"
              description="Base utility for shimmer effect. Requires text color to be visible."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer text-foreground/60">Shimmer Effect</span>'
                highlight="shimmer"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span className="shimmer text-foreground/80 dark:text-foreground/60 text-xl font-semibold">
                Shimmer Effect
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-invert"
              description={
                <>
                  Fades text <span className="dark:hidden">lighter</span>
                  <span className="hidden dark:inline">darker</span> instead.
                  Allows you to use <span className="dark:hidden">darker</span>
                  <span className="hidden dark:inline">brighter</span> text
                  colors and still get a stark shimmer effect.
                </>
              }
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-invert text-foreground/60">Shimmer</span>'
                highlight="shimmer-invert"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span className="shimmer shimmer-invert text-foreground/60 dark:text-foreground/80 text-xl font-semibold">
                Shimmer Effect
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Automatic Color"
              description="Shimmer automatically picks a color based on your text color."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer text-blue-600">Blue Shimmer</span>'
                highlight="text-blue"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span className="shimmer text-xl font-semibold text-blue-600">
                Blue Shimmer
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-color-{color}"
              description="Override the automatic color with a custom shimmer color."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-color-orange-500 text-foreground/40">Orange Shimmer</span>'
                highlight="shimmer-color"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span className="shimmer shimmer-color-orange-500 text-foreground/40 text-xl font-semibold">
                Orange Shimmer
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-spread-{value}"
              description="Width of the shimmer highlight in pixels. Default: 120px."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-spread-200 text-foreground/40">Wide Shimmer</span>'
                highlight="shimmer-spread"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="flex flex-col items-start gap-2">
                <span className="shimmer shimmer-spread-60 shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (60px)
                </span>
                <span className="shimmer shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (120px)
                </span>
                <span className="shimmer shimmer-spread-200 shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (200px)
                </span>
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-angle-{value}"
              description="Angle of the shimmer sweep in degrees. Default: 15deg (resulting in a 105deg gradient). Higher values create a more diagonal sweep."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-angle-75 text-foreground/40">Diagonal Shimmer</span>'
                highlight="shimmer-angle"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="flex flex-col items-start gap-2">
                <span className="shimmer shimmer-angle-0 shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (0deg)
                </span>
                <span className="shimmer shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (15deg)
                </span>
                <span className="shimmer shimmer-angle-75 shimmer-duration-5000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (75deg)
                </span>
              </div>
            </BoxContent>
          </Box>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-medium">Animation Timing</h2>
          <p className="text-muted-foreground text-xl">
            Control how long the shimmer animation takes.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-md border border-dashed p-6">
            <p className="text-muted-foreground mb-4 text-center text-sm">
              Total animation cycle
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className="rounded bg-blue-500/20 px-4 py-2 font-mono text-sm">
                  shimmer animation
                </div>
                <span className="text-muted-foreground text-xs">
                  (duration or speed)
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-xl">+</span>
              <div className="flex flex-col items-center gap-1">
                <div className="rounded bg-orange-500/20 px-4 py-2 font-mono text-sm">
                  repeat delay
                </div>
                <span className="text-muted-foreground text-xs">
                  (default: 1000ms)
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Option A
              </p>
              <Box>
                <div className="bg-muted/40 space-y-2 p-6">
                  <h3 className="font-mono text-lg">
                    shimmer-duration-{"{ms}"}
                  </h3>
                  <p className="text-muted-foreground max-w-[70ch] text-sm">
                    Fixed duration in milliseconds. Larger elements will appear
                    to move faster since they cover more distance in the same
                    time.
                  </p>
                </div>
                <BoxCode>
                  <CodeBlock
                    language="html"
                    code='<span class="shimmer shimmer-duration-2000">...</span>'
                    highlight="shimmer-duration"
                    highlightMode="text"
                  />
                </BoxCode>
                <BoxContent>
                  <div className="flex flex-col items-start gap-2">
                    <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-semibold">
                      Short
                    </span>
                    <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-semibold">
                      Medium Length Text
                    </span>
                    <span className="shimmer shimmer-duration-2000 text-foreground/40 text-xl font-semibold">
                      This Is A Much Longer Text
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs">
                    Same duration, different perceived speeds
                  </p>
                </BoxContent>
              </Box>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Option B
              </p>
              <Box>
                <div className="bg-muted/40 space-y-2 p-6">
                  <h3 className="font-mono text-lg">
                    shimmer-speed-{"{px/s}"}
                  </h3>
                  <p className="text-muted-foreground max-w-[70ch] text-sm">
                    Speed in pixels per second. All elements sweep at the same
                    visual speed regardless of width. Default: 200px/s.
                  </p>
                </div>
                <BoxCode>
                  <CodeBlock
                    language="html"
                    code='<span class="shimmer shimmer-speed-200">...</span>'
                    highlight="shimmer-speed"
                    highlightMode="text"
                  />
                </BoxCode>
                <BoxContent>
                  <div className="flex flex-col items-start gap-2">
                    <span className="shimmer shimmer-speed-200 shimmer-repeat-delay-1975 text-foreground/40 text-xl font-semibold [--shimmer-track-width:50px]">
                      Short
                    </span>
                    <span className="shimmer shimmer-speed-200 shimmer-repeat-delay-1300 text-foreground/40 text-xl font-semibold [--shimmer-track-width:185px]">
                      Medium Length Text
                    </span>
                    <span className="shimmer shimmer-speed-200 text-foreground/40 text-xl font-semibold [--shimmer-track-width:245px]">
                      This Is A Much Longer Text
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs">
                    Same speed, different durations
                  </p>
                </BoxContent>
              </Box>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div />
            <div className="border border-dashed border-amber-500/20 bg-amber-500/5 p-4 text-sm">
              <p className="mb-1 font-semibold">
                Width Required for shimmer-speed
              </p>
              <p className="text-muted-foreground">
                CSS can&apos;t read text width, so you need to measure it with
                JavaScript and pass it in. Without it, defaults to 200px.
              </p>
              <code className="bg-muted mt-2 block rounded px-2 py-1 text-xs">
                {'style={{ "--shimmer-track-width": width }}'}
              </code>
            </div>
          </div>

          <Box>
            <BoxTitle
              title="shimmer-repeat-delay-{value}"
              description="Delay between animation cycles in milliseconds. Default: 1000ms. Use 0 for continuous shimmer without pause."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-repeat-delay-0">No Delay</span>'
                highlight="shimmer-repeat-delay"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="flex flex-col items-start gap-2 [--shimmer-track-height:28px]">
                <span className="shimmer shimmer-repeat-delay-0 shimmer-duration-3000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (0ms)
                </span>
                <span className="shimmer shimmer-duration-3000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (1000ms)
                </span>
                <span className="shimmer shimmer-repeat-delay-2000 shimmer-duration-3000 text-foreground/40 text-xl font-semibold">
                  Shimmer Effect (2000ms)
                </span>
              </div>
            </BoxContent>
          </Box>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-medium">Background Shimmer</h2>
          <p className="text-muted-foreground text-xl">
            Add shimmer to skeleton components and non-text elements.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="shimmer shimmer-bg"
              description="Background shimmer for skeleton loaders. Apply both shimmer and shimmer-bg classes."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer shimmer-bg h-4 w-64 rounded bg-muted" />'
                highlight="shimmer-bg"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer-container">
                <div className="shimmer shimmer-bg bg-muted h-4 w-64 rounded" />
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Skeleton Card Example"
              description="Wrap skeleton elements in shimmer-container for automatic width detection. Use --shimmer-x and --shimmer-y to coordinate timing across the diagonal sweep."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div class="shimmer-container flex gap-3">
  <div class="shimmer shimmer-bg [--shimmer-x:0] [--shimmer-y:0] size-12 rounded-full bg-muted" />
  <div class="flex-1 space-y-1">
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:0] h-4 w-1/4 rounded bg-muted" />
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:20] h-4 w-full rounded bg-muted" />
    <div class="shimmer shimmer-bg [--shimmer-x:60] [--shimmer-y:40] h-4 w-4/5 rounded bg-muted" />
  </div>
</div>`}
                highlight={["--shimmer-x", "--shimmer-y"]}
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Uncoordinated
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
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Synchronized with x/y coordinates
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
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Color Customization"
              description="Override the shimmer highlight color with shimmer-color-{color}. Default: text color at 20% alpha."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div class="shimmer shimmer-bg shimmer-color-blue-300/30 ..." />
<div class="shimmer shimmer-bg shimmer-color-amber-200/30 ..." />`}
                highlight="shimmer-color"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer-container space-y-1">
                <div className="shimmer shimmer-bg shimmer-color-blue-300/30 bg-muted h-4 w-48 rounded" />
                <div className="shimmer shimmer-bg shimmer-color-amber-200/30 bg-muted h-4 w-48 rounded" />
              </div>
              <p className="text-muted-foreground mt-4 mb-2 text-sm font-medium">
                With custom background color
              </p>
              <div className="shimmer-container space-y-1">
                <div className="shimmer shimmer-bg shimmer-color-sky-300/20 dark:shimmer-color-sky-900 h-4 w-48 rounded bg-sky-200 dark:bg-sky-800" />
                <div className="shimmer shimmer-bg shimmer-color-violet-300/20 dark:shimmer-color-violet-900 h-4 w-48 rounded bg-violet-200 dark:bg-violet-800" />
              </div>
            </BoxContent>
          </Box>
        </div>
      </div>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
  highlight?: string | string[];
  highlightMode?: "line" | "text";
}

interface BoxTitleProps {
  title: string;
  description: React.ReactNode;
}

interface BoxCodeHeaderProps {
  fileName: string;
}

function CodeBlock({
  language,
  code,
  highlight,
  highlightMode = "line",
}: CodeBlockProps) {
  let metaProps = {};

  if (highlight) {
    const highlights = Array.isArray(highlight) ? highlight : [highlight];

    if (highlightMode === "text") {
      const patterns = highlights.map((h) => `/${h}/`).join(" ");
      metaProps = { meta: { __raw: patterns } };
    } else if (highlightMode === "line") {
      const lines = code.split("\n");
      const lineNumbers = lines
        .map((line, index) =>
          highlights.some((h) => line.includes(h)) ? index + 1 : null,
        )
        .filter((n): n is number => n !== null);

      if (lineNumbers.length > 0) {
        metaProps = { meta: { __raw: `{${lineNumbers.join(",")}}` } };
      }
    }
  }

  return (
    <SyntaxHighlighter
      language={language}
      code={code}
      {...metaProps}
      addDefaultStyles={false}
      className="[--padding-left:1.5rem] [&_code]:block [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:bg-transparent! [&_pre]:px-0 [&_pre]:py-4"
      transformers={[
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
      ]}
      components={{
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Pre: ({ className, ...props }: any) => (
          <pre className={className} {...props} />
        ),
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Code: ({ className, ...props }: any) => (
          <code className={className} {...props} />
        ),
      }}
    />
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

function BoxTitle({ title, description }: BoxTitleProps) {
  return (
    <div className="bg-muted/40 space-y-2 p-6">
      <h3 className="font-mono text-lg">{title}</h3>
      <p className="text-muted-foreground max-w-[70ch] text-sm">
        {description}
      </p>
    </div>
  );
}

function BoxContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function BoxCodeHeader({ fileName }: BoxCodeHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 font-mono text-sm font-medium">
      <FileCode className="text-muted-foreground size-4" />
      {fileName}
    </div>
  );
}

function BoxCode({ children }: { children: React.ReactNode }) {
  return <div className="p-2 text-sm">{children}</div>;
}
