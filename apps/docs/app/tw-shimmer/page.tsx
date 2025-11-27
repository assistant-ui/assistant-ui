"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Sparkles, FileCode } from "lucide-react";
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
  .shimmer-metallic {
    --metallic-start: rgba(0,0,0,0.2);
    --metallic-end: rgba(0,0,0,0.4);
    background:
      linear-gradient(
        var(--shimmer-angle),
        transparent calc(50% - var(--shimmer-spread) * 0.5),
        color-mix(in oklch, var(--shimmer-color), transparent 94%)
          calc(50% - var(--shimmer-spread) * 0.42),
        color-mix(in oklch, var(--shimmer-color), transparent 76%)
          calc(50% - var(--shimmer-spread) * 0.33),
        color-mix(in oklch, var(--shimmer-color), transparent 50%)
          calc(50% - var(--shimmer-spread) * 0.25),
        color-mix(in oklch, var(--shimmer-color), transparent 24%)
          calc(50% - var(--shimmer-spread) * 0.17),
        color-mix(in oklch, var(--shimmer-color), transparent 6%)
          calc(50% - var(--shimmer-spread) * 0.08),
        var(--shimmer-color) 50%,
        color-mix(in oklch, var(--shimmer-color), transparent 6%)
          calc(50% + var(--shimmer-spread) * 0.08),
        color-mix(in oklch, var(--shimmer-color), transparent 24%)
          calc(50% + var(--shimmer-spread) * 0.17),
        color-mix(in oklch, var(--shimmer-color), transparent 50%)
          calc(50% + var(--shimmer-spread) * 0.25),
        color-mix(in oklch, var(--shimmer-color), transparent 76%)
          calc(50% + var(--shimmer-spread) * 0.33),
        color-mix(in oklch, var(--shimmer-color), transparent 94%)
          calc(50% + var(--shimmer-spread) * 0.42),
        transparent calc(50% + var(--shimmer-spread) * 0.5)
      )
      0 0 / 200% 100% no-repeat,
      linear-gradient(to top, var(--metallic-start), var(--metallic-end));
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .dark .shimmer-metallic {
    --metallic-start: rgba(255,255,255,0.2);
    --metallic-end: rgba(255,255,255,0.4);
  }
`;

export default function TwShimmerPage() {
  const [copied, setCopied] = useState(false);
  const [angledSynced, setAngledSynced] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const autoWidthRef = useCallback((node: HTMLElement | null): void => {
    if (!node) return;
    document.fonts.ready.then(() => {
      node.style.setProperty("--shimmer-width", `${node.offsetWidth}`);
    });
  }, []);

  return (
    <div className="container max-w-7xl space-y-16 px-4 py-12">
      <div
        className="flex flex-col items-center space-y-6 text-center"
        ref={autoWidthRef}
      >
        <div className="shimmer-bg flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm shimmer-angle-45 shimmer-speed-200 shimmer-width-400">
          <Sparkles className="size-4" />
          <span>Tailwind CSS v4 Plugin</span>
        </div>

        <div className="relative flex flex-col gap-5">
          <div>
            <span
              className={cn(
                "pointer-events-none absolute inset-0 select-none",
                "text-5xl font-bold tracking-tight lg:text-8xl",
                "shimmer shimmer-speed-200 shimmer-width-400",
                "text-black shimmer-color-black",
                "shimmer-angle-45 dark:text-black dark:shimmer-color-white",
                "blur-xl",
                "-z-1",
                "mix-blend-screen",
                "opacity-30",
              )}
              aria-hidden="true"
            >
              tw-shimmer
            </span>
            {/* Base shimmer text */}
            <h1
              className={cn(
                "text-5xl font-bold tracking-tight lg:text-8xl",
                "shimmer-metallic shimmer shimmer-angle-45 shimmer-speed-200 shimmer-width-400",
                "shimmer-color-black",
                "dark:shimmer-color-white",
              )}
            >
              tw-shimmer
            </h1>
            {/* Emboss layer - creates depth with highlight and shadow */}
            <span
              className={cn(
                "pointer-events-none absolute inset-0 select-none",
                "text-5xl font-bold tracking-tight text-transparent lg:text-8xl",
                "[text-shadow:0px_0px_0_rgba(0,0,0,0.2)]",
                "dark:[text-shadow:1px_1px_0.5px_rgba(0,0,0,0.4)]",
              )}
              aria-hidden="true"
            >
              tw-shimmer
            </span>
          </div>

          <p
            className={cn(
              "max-w-[600px] text-lg font-light text-balance text-muted-foreground",
              "shimmer shimmer-angle-45 shimmer-speed-200 shimmer-spread-50 shimmer-width-400",
              "shimmer-color-black dark:shimmer-color-gray-300",
            )}
          >
            Zero-dependency CSS-only shimmer effect. Fully customizable,
            performant, and easy to use.
          </p>
        </div>
      </div>

      <div id="installation" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Installation</h2>
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
          <h2 className="text-3xl font-bold tracking-tight">Usage</h2>
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
                code='<span class="shimmer text-foreground/40">Text</span>'
                highlight="shimmer"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-lg font-semibold text-foreground/40"
              >
                Shimmer Effect
              </span>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-speed-{value}"
              description="Animation speed in pixels per second. Default: 100px/s"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-speed-200 text-foreground/40">Fast</span>'
                highlight="shimmer-speed-200"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-lg font-semibold text-foreground/40 shimmer-speed-200"
              >
                Fast Shimmer
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
  class="shimmer text-foreground/40"
  style={{ ["--shimmer-width" as string]: "52" }}
>
  Narrow
</span>`}
                highlight="--shimmer-width"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <p className="text-sm text-muted-foreground">
                Without this variable, animation speed varies by element width.
                <br />
                Use JS to set element width for consistent scroll speed.
              </p>
            </BoxContent>
            <BoxContent>
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
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
                  <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
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
              description="Shimmer highlight color. Uses Tailwind color palette. Default: currentColor"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<span class="shimmer shimmer-color-blue-500 text-blue-500/40">Blue</span>'
                highlight="shimmer-color-blue-500"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-lg font-semibold text-blue-500/40 shimmer-color-blue-500 dark:text-blue-300/40 dark:shimmer-color-blue-300"
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
                code='<span class="shimmer shimmer-spread-24 text-foreground/40">Wide</span>'
                highlight="shimmer-spread-24"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <span
                ref={autoWidthRef}
                className="shimmer text-lg font-semibold text-foreground/40 shimmer-spread-24"
              >
                Wide Spread Shimmer
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
                code={`<div
  class="shimmer shimmer-angle-45 inline-block text-foreground/40"
> Diagonal
</div>`}
                highlight="shimmer-angle-45"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div
                ref={autoWidthRef}
                className="inline-block shimmer text-lg font-semibold text-foreground/40 shimmer-angle-45"
              >
                A multi-line
                <br />
                Diagonal Shimmer
              </div>
            </BoxContent>
          </Box>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Background Shimmer
          </h2>
          <p className="mt-2 text-muted-foreground">
            Use <code className="px-1 py-0.5 text-sm">shimmer-bg</code> for
            skeleton loaders and non-text elements.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="shimmer-bg"
              description="Background shimmer for skeleton loaders and non-text elements."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer-bg bg-muted h-4 w-48 rounded" />'
                highlight="shimmer-bg"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer-bg h-4 w-48 rounded bg-muted" />
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Skeleton Card Example"
              description="Set --shimmer-width on the container to match the container width. All children share the same animation."
            />
            <BoxCode>
              <CodeBlock
                language="tsx"
                code={`<div
  class="flex gap-3"
  style={{ ["--shimmer-width" as string]: "600" }}
>
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-1/4 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
    <div class="shimmer-bg bg-muted h-4 w-4/5 rounded" />
  </div>
</div>`}
                highlight="--shimmer-width"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div
                className="flex gap-3"
                style={{ ["--shimmer-width" as string]: "600" }}
              >
                <div className="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
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
                code={`<div class="shimmer-bg bg-blue-300 shimmer-color-blue-100 dark:bg-blue-800 dark:shimmer-color-blue-500 h-4 w-48 rounded" />`}
                highlight="shimmer-color-blue-100"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div
                className="space-y-3"
                style={{ ["--shimmer-width" as string]: "192" }}
              >
                <div className="shimmer-bg h-4 w-48 rounded bg-blue-300 shimmer-color-blue-100 dark:bg-blue-800 dark:shimmer-color-blue-500" />
                <div className="shimmer-bg h-4 w-48 rounded bg-purple-300 shimmer-color-purple-100 dark:bg-purple-800 dark:shimmer-color-purple-500" />
                <div className="shimmer-bg h-4 w-48 rounded bg-green-300 shimmer-color-green-100 dark:bg-green-800 dark:shimmer-color-green-500" />
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
  class="flex gap-3 shimmer-angle-15"
  style={{ ["--shimmer-width" as string]: "600" }}
>
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-1/4 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
    <div class="shimmer-bg bg-muted h-4 w-4/5 rounded" />
  </div>
</div>`}
                highlight="shimmer-angle-15"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div
                className="flex gap-3 shimmer-angle-15"
                style={{ ["--shimmer-width" as string]: "600" }}
              >
                <div className="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-full rounded bg-muted" />
                  <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                With angled shimmers, elements at different positions may appear
                slightly disjointed. This is a limitation of pure CSS animation.
                For most layouts this is barely noticeable. Power users can use
                the optional{" "}
                <code className="px-1 py-0.5 text-xs">shimmer-x-*/y-*</code>{" "}
                utilities below for finer control.
              </p>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="Advanced: shimmer-x-{value} / shimmer-y-{value}"
              description="Optional manual sync for angled shimmers. Most users can skip this."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div
  class="shimmer-angle-15 flex gap-3"
>
  <div class="shimmer-bg shimmer-x-20 shimmer-y-20 bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg shimmer-x-52 shimmer-y-0 bg-muted h-4 w-1/4 rounded" />
    <div class="shimmer-bg shimmer-x-52 shimmer-y-24 bg-muted h-4 w-full rounded" />
    <div class="shimmer-bg shimmer-x-52 shimmer-y-48 bg-muted h-4 w-4/5 rounded" />
  </div>
</div>`}
                highlight={["shimmer-x-", "shimmer-y-"]}
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <p className="mb-4 text-sm text-muted-foreground">
                These utilities provide manual position hints (in pixels) that
                feed into the animation-delay formula. By specifying each
                element&apos;s approximate x/y offset from a shared origin, the
                plugin can align the diagonal sweep across elements—creating the
                illusion of a single highlight passing through all of them.
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                <strong>When to use:</strong> Only needed for angled shimmers
                (not{" "}
                <code className="px-1 py-0.5 text-xs">shimmer-angle-90</code>)
                on multi-element layouts like skeleton cards. Vertical shimmers
                sync automatically.
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                <strong>Expectations:</strong> Because this is pure CSS with no
                runtime layout access, sync is &quot;best-effort.&quot; Some
                trial and error may be needed to find good offsets. Minor desync
                at shallow angles or with large rounded shapes is normal.
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                <strong>Tip:</strong> For larger elements like avatars, use
                center coordinates instead of top-left for better visual
                alignment.
              </p>
              <label className="mb-4 flex w-fit cursor-pointer items-center gap-2">
                <span className="text-sm font-medium">Sync</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={angledSynced}
                  onClick={() => setAngledSynced(!angledSynced)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    angledSynced ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow transition-transform ${
                      angledSynced ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
              <div
                className="flex gap-3 shimmer-angle-15"
                style={{ ["--shimmer-width" as string]: "720" }}
              >
                <div
                  className={cn(
                    "shimmer-bg size-16 shrink-0 rounded-full bg-muted",
                    angledSynced && "shimmer-x-0 shimmer-y-16",
                  )}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-1/4 rounded bg-muted",
                      angledSynced && "shimmer-x-52 shimmer-y-0",
                    )}
                  />
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-full rounded bg-muted",
                      angledSynced && "shimmer-x-52 shimmer-y-24",
                    )}
                  />
                  <div
                    className={cn(
                      "shimmer-bg h-4 w-4/5 rounded bg-muted",
                      angledSynced && "shimmer-x-52 shimmer-y-48",
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
    <>
      <style jsx global>
        {HIGHLIGHT_STYLES}
      </style>
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
    </>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

function BoxTitle({ title, description }: BoxTitleProps) {
  return (
    <div className="space-y-2 p-6">
      <h3 className="font-mono text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
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
  return <div>{children}</div>;
}
