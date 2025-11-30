"use client";

import { useState, useCallback } from "react";
import { Copy, Check, FileCode, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [anglesAligned, setAnglesAligned] = useState(true);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const autoWidthRef = useCallback((node: HTMLElement | null): void => {
    if (!node) return;
    document.fonts.ready.then(() => {
      node.style.setProperty("--shimmer-width", `${node.offsetWidth}`);
    });
  }, []);

  return (
    <div className="container max-w-7xl space-y-16 px-4 py-12">
      <HighlightStyles />
      <div
        className="mx-auto flex w-fit flex-col items-center space-y-6 border border-red-500 text-center shimmer-speed-200"
        ref={autoWidthRef}
      >
        <div className="shimmer-bg z-0 flex cursor-default rounded-full bg-border p-px shimmer-color-[rgba(255,255,255,0.2)]">
          <div className="z-10 flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-sm">
            <Sparkle className="size-4 opacity-50" />
            <span className="shimmer text-foreground/60 shimmer-color-[rgba(0,0,0,0.5)] shimmer-spread-30 dark:shimmer-color-[rgba(255,255,255,0.5)]">
              Tailwind CSS v4 Plugin
            </span>
          </div>
        </div>

        <div className="relative flex flex-col gap-5">
          <div className="pointer-events-none text-5xl font-bold tracking-tight select-none lg:text-7xl">
            {/* Base shimmer text */}
            <h1
              className={cn(
                "shimmer text-foreground/30",
                "shimmer-color-black",
                "dark:shimmer-color-white",
              )}
            >
              tw-shimmer
            </h1>
          </div>

          <p className="relative max-w-[600px] shimmer text-lg font-light text-balance text-muted-foreground shimmer-color-black shimmer-spread-50 dark:shimmer-color-neutral-300">
            Zero-dependency CSS-only shimmer effect. Fully customizable,
            performant, and easy to use.
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
            <BoxCodeHeader fileName="app/globals.css" />
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
          <h2 className="text-3xl font-medium">Usage</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="border border-dashed border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            <p className="mb-1 font-semibold">💡 Important</p>
            <p className="text-muted-foreground">
              The shimmer effect uses{" "}
              <code className="px-1 py-0.5 text-xs">background-clip: text</code>
              , so you need to set a text color for the base text. Use{" "}
              <code className="px-1 py-0.5 text-xs">text-foreground/40</code> or
              similar opacity to see the shimmer effect clearly.
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
                code='<span class="shimmer text-foreground/40">Shimmer Effect</span>'
                highlight="shimmer"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-xl font-semibold text-foreground/40"
              >
                Shimmer Effect
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-speed-{value}"
              description="Animation speed in pixels per second. Default: 100px/s for text shimmer. Background shimmer defaults to 500px/s."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-speed-300 text-foreground/40">Faster Shimmer</span>'
                highlight="shimmer-speed"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-xl font-semibold text-foreground/40 shimmer-speed-300"
              >
                Faster Shimmer
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="--shimmer-width"
              description="CSS variable for container width in pixels used in speed calculations. Default: 200px"
            />
            <BoxCode>
              <CodeBlock
                language="tsx"
                code={`<span
  class="shimmer text-foreground/40 shimmer-width-100"
>
  A short line
</span>`}
                highlight="shimmer-width"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <p className="text-sm text-muted-foreground">
                Without this variable, animation speed varies by element width.
                <br />
                Use JS to set element width for consistent shimmer speed.
              </p>
            </BoxContent>
            <BoxContent>
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Set --shimmer-width for consistent speed:
                  </p>
                  <div className="space-y-2">
                    <span
                      ref={autoWidthRef}
                      className="shimmer text-sm font-semibold text-foreground/40"
                    >
                      A short line
                    </span>
                    <br />
                    <span
                      ref={autoWidthRef}
                      className="shimmer text-sm font-semibold text-foreground/40"
                    >
                      An example of a longer line but same speed
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Default --shimmer-width:
                  </p>
                  <div className="space-y-2">
                    <span className="shimmer text-sm font-semibold text-foreground/40">
                      A short line
                    </span>
                    <br />
                    <span className="shimmer text-sm font-semibold text-foreground/40">
                      An example of a longer line but same duration
                    </span>
                  </div>
                </div>
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-color-{color}"
              description="Shimmer highlight color. Uses the Tailwind color palette. Default: black for text in light mode (white in dark mode), white for background shimmer."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-color-blue-300 text-blue-500/60">Blue Shimmer</span>'
                highlight="shimmer-color"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-xl font-semibold text-blue-500/60 shimmer-color-blue-300"
              >
                Blue Shimmer
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-spread-{spacing}"
              description="Width of the shimmer highlight. Uses Tailwind spacing. Default: 6ch"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-spread-40 text-foreground/40">Wide Shimmer</span>'
                highlight="shimmer-spread"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-xl font-semibold text-foreground/40 shimmer-spread-40"
              >
                Wide Shimmer
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-angle-{degrees}"
              description="Shimmer direction in degrees. Default: 90deg"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer shimmer-angle-45 font-semibold text-foreground/40">Diagonal Shimmer</div>'
                highlight="shimmer-angle"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-xl font-semibold text-foreground/40 shimmer-angle-45"
              >
                Diagonal Shimmer
              </span>
            </BoxContent>
          </Box>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-medium">Background Shimmer</h2>
          <p className="text-xl text-muted-foreground">
            Use <code className="px-1 py-0.5 text-sm">shimmer-bg</code> for
            skeleton loaders and non-text elements.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="shimmer-bg"
              description="Background shimmer for skeleton loaders and non-text elements. Defaults: 600px width, 500px/s speed."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer-bg h-4 w-48 rounded bg-muted" />'
                highlight="shimmer-bg"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer-bg h-4 w-64 rounded bg-muted" />
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Skeleton Card Example"
              description="Set --shimmer-width on the container to match its width. All children share the same animation timing."
            />
            <BoxCode>
              <CodeBlock
                language="tsx"
                code={`<div
  class="flex gap-3 shimmer-width-720"
  >
  <div class="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
  <div class="flex-1 space-y-1">
    <div class="shimmer-bg h-4 w-1/4 rounded bg-muted" />
    <div class="shimmer-bg h-4 w-full rounded bg-muted" />
    <div class="shimmer-bg h-4 w-4/5 rounded bg-muted" />
  </div>
</div>`}
                highlight="shimmer-width"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="flex gap-3" ref={autoWidthRef}>
                <div className="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-full rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
                </div>
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="bg-{color} + shimmer-color-{color}"
              description="Use standard Tailwind bg-* for base color. Customize highlight with shimmer-color-* (shared with text shimmer)."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div class="shimmer-bg h-4 w-48 rounded bg-blue-600 shimmer-color-blue-400" />
<div class="shimmer-bg h-4 w-48 rounded bg-purple-600 shimmer-color-purple-400" />
<div class="shimmer-bg h-4 w-48 rounded bg-green-600 shimmer-color-green-400" />`}
                highlight="shimmer-color"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="space-y-1" ref={autoWidthRef}>
                <div className="shimmer-bg h-4 w-48 rounded bg-blue-600 shimmer-color-blue-400" />
                <div className="shimmer-bg h-4 w-48 rounded bg-purple-600 shimmer-color-purple-400" />
                <div className="shimmer-bg h-4 w-48 rounded bg-green-600 shimmer-color-green-400" />
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-angle-{degrees}"
              description="Add a diagonal sweep to your skeleton shimmer. Shared with text shimmer."
            />
            <BoxCode>
              <CodeBlock
                language="tsx"
                code={`<div
  class="flex gap-3 shimmer-width-720 shimmer-angle-15"
>
  <div class="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
  <div class="flex-1 space-y-1">
    <div class="shimmer-bg h-4 w-1/4 rounded bg-muted" />
    <div class="shimmer-bg h-4 w-full rounded bg-muted" />
    <div class="shimmer-bg h-4 w-4/5 rounded bg-muted" />
  </div>
</div>`}
                highlight="shimmer-angle"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="flex gap-3 shimmer-angle-15" ref={autoWidthRef}>
                <div className="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-full rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
                </div>
              </div>
              <p className="mt-4 max-w-[60ch] text-sm text-muted-foreground">
                With angled shimmers, elements at different positions may appear
                slightly out of sync. CSS has no way to know where each element
                sits on the page, so it can&apos;t automatically coordinate the
                timing. For most layouts this is barely noticeable. For precise
                control, use the optional{" "}
                <code className="px-1 py-0.5 text-xs">shimmer-x-*/y-*</code>{" "}
                utilities below.
              </p>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Advanced: shimmer-x-{value} / shimmer-y-{value}"
              description="Optional manual alignment utilities for angled shimmers. Typically only needed for low angled shimmers on multi-element layouts like skeleton states. This approach has the benefit of remaining coherent at different widths."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div class="flex gap-3 shimmer-width-720 shimmer-angle-15">
  <div class="shimmer-bg shimmer-x-24 shimmer-y-24 size-12 rounded-full bg-muted" />
  <div class="flex-1 space-y-1">
    <div class="shimmer-bg shimmer-x-52 shimmer-y-0 h-4 w-1/4 rounded bg-muted" />
    <div class="shimmer-bg shimmer-x-52 shimmer-y-20 h-4 w-full rounded bg-muted" />
    <div class="shimmer-bg shimmer-x-52 shimmer-y-40 h-4 w-4/5 rounded bg-muted" />
  </div>
</div>`}
                highlight={["shimmer-x-", "shimmer-y-"]}
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <p className="mb-4 max-w-[60ch] text-sm text-muted-foreground">
                Specify each element&apos;s approximate x/y position (in pixels)
                to coordinate timing across a diagonal sweep. Only needed for
                angled shimmers on multi-element layouts.
              </p>
              <p className="mb-4 max-w-[60ch] text-sm text-muted-foreground">
                Some trial and error may be needed. For large elements like
                avatars, use center pixel coordinates for better alignment.
              </p>
              <label className="mb-4 flex w-fit cursor-pointer items-center gap-2">
                <span className="text-sm font-medium">Auto-aligned</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={anglesAligned}
                  onClick={() => setAnglesAligned(!anglesAligned)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    anglesAligned ? "bg-foreground" : "bg-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow transition-transform ${
                      anglesAligned ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
              <div className="flex gap-3 shimmer-angle-15" ref={autoWidthRef}>
                <div
                  className={cn(
                    "shimmer-bg size-12 shrink-0 rounded-full bg-muted",
                    anglesAligned && "shimmer-x-24 shimmer-y-24",
                  )}
                />
                <div className="flex-1 space-y-1">
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-1/4 rounded bg-muted",
                      anglesAligned && "shimmer-x-52 shimmer-y-0",
                    )}
                  />
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-full rounded bg-muted",
                      anglesAligned && "shimmer-x-52 shimmer-y-20",
                    )}
                  />
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-4/5 rounded bg-muted",
                      anglesAligned && "shimmer-x-52 shimmer-y-40",
                    )}
                  />
                </div>
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
  description: string;
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
  // Build the meta object for Shiki transformers
  let metaProps = {};

  if (highlight) {
    const highlights = Array.isArray(highlight) ? highlight : [highlight];

    if (highlightMode === "text") {
      // Multiple /pattern/ entries for each highlight
      const patterns = highlights.map((h) => `/${h}/`).join(" ");
      metaProps = { meta: { __raw: patterns } };
    } else if (highlightMode === "line") {
      // Find lines containing any of the highlight texts
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
        Pre: ({ className, ...props }: any) => (
          <pre className={className} {...props} />
        ),
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
    <div className="space-y-2 bg-muted/40 p-6">
      <h3 className="font-mono text-lg">{title}</h3>
      <p className="max-w-[70ch] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function BoxContent({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4">{children}</div>;
}

function BoxCodeHeader({ fileName }: BoxCodeHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 font-mono text-sm font-medium">
      <FileCode className="size-4 text-muted-foreground" />
      {fileName}
    </div>
  );
}

function BoxCode({ children }: { children: React.ReactNode }) {
  return <div className="text-sm">{children}</div>;
}
