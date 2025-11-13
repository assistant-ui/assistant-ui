"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, Sparkles, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function TwShimmerPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    document.title = "tw-shimmer by assistant-ui";
  }, []);

  return (
    <div className="container max-w-screen-xl space-y-16 px-4 py-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
          <Sparkles className="size-4" />
          <span>Tailwind CSS v4 Plugin</span>
        </div>

        <h1 className="shimmer text-6xl font-bold tracking-tight text-foreground/40 shimmer-speed-150 lg:text-7xl">
          tw-shimmer
        </h1>

        <p className="max-w-[600px] text-lg text-muted-foreground">
          A zero-dependency Tailwind CSS v4 plugin for beautiful shimmer
          effects. Fully customizable, performant, and easy to use.
        </p>
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
                highlight='"tw-shimmer"'
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
                code='<div class="shimmer text-foreground/40">Text</div>'
                highlight="shimmer"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer text-lg font-semibold text-foreground/40">
                Shimmer Effect
              </div>
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
                code='<div class="shimmer shimmer-speed-200 text-foreground/40">Fast</div>'
                highlight="shimmer-speed-200"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer text-lg font-semibold text-foreground/40 shimmer-speed-200">
                Fast Shimmer
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="--shimmer-width-x"
              description="CSS variable for container width. Default: 200px"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div
  class="shimmer text-foreground/40"
  style={{ ["--shimmer-width-x" as string]: "50px" }}
>
  Narrow
</div>`}
                highlight="--shimmer-width-x"
                highlightMode="text"
              />
            </BoxCode>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-color-{color}"
              description="Shimmer highlight color. Uses Tailwind color palette. Default: currentColor"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer shimmer-color-blue-500 text-blue-500/40">Blue</div>'
                highlight="shimmer-color-blue-500"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer text-lg font-semibold text-blue-500/40 shimmer-color-blue-500 dark:text-blue-300/40 dark:shimmer-color-blue-300">
                Blue Shimmer
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxTitle
              title="shimmer-spread-{spacing}"
              description="Width of shimmer highlight. Uses Tailwind spacing. Default: 6ch"
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="shimmer shimmer-spread-12 text-foreground/40">Wide</div>'
                highlight="shimmer-spread-12"
                highlightMode="text"
              />
            </BoxCode>
            <BoxContent>
              <div className="shimmer text-lg font-semibold text-foreground/40 shimmer-spread-24">
                Wide Spread Shimmer
              </div>
            </BoxContent>
          </Box>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  language,
  code,
  highlight,
  highlightMode = "line",
}: {
  language: string;
  code: string;
  highlight?: string;
  highlightMode?: "line" | "text";
}) {
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlight || !codeRef.current) return;

    const timer = setTimeout(() => {
      const codeElement = codeRef.current?.querySelector("code");
      if (!codeElement) return;

      if (highlightMode === "line") {
        codeElement.querySelectorAll(".line").forEach((line) => {
          if (line.textContent?.includes(highlight)) {
            line.classList.add("highlighted-line");
          }
        });
      } else {
        const walker = document.createTreeWalker(
          codeElement,
          NodeFilter.SHOW_TEXT,
        );
        const textNodes: Text[] = [];
        let node: Node | null;

        while ((node = walker.nextNode())) {
          textNodes.push(node as Text);
        }

        textNodes.forEach((textNode) => {
          const text = textNode.textContent || "";
          if (text.includes(highlight)) {
            const span = document.createElement("span");
            span.innerHTML = text.replace(
              new RegExp(`(${escapeRegex(highlight)})`, "g"),
              '<mark class="bg-blue-600/20 dark:bg-blue-300/30 px-0.5 rounded not-italic font-[inherit] text-blue-900 dark:text-blue-100">$1</mark>',
            );
            textNode.replaceWith(span);
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [highlight, highlightMode]);

  return (
    <div ref={codeRef}>
      <style jsx>{`
        :global(.highlighted-line) {
          background: rgba(59, 130, 246, 0.15);
          display: block;
        }
        :global(.dark .highlighted-line) {
          background: rgba(147, 197, 253, 0.25);
        }
      `}</style>
      <SyntaxHighlighter
        language={language}
        code={code}
        addDefaultStyles={false}
        className="[--padding-left:1.5rem] [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:!bg-transparent [&_pre]:px-0 [&_pre]:py-4"
        components={{
          Pre: ({ className, ...props }: any) => (
            <pre className={className} {...props} />
          ),
          Code: ({ className, ...props }: any) => (
            <code className={className} {...props} />
          ),
        }}
      />
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

function BoxTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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

function BoxCodeHeader({ fileName }: { fileName: string }) {
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
