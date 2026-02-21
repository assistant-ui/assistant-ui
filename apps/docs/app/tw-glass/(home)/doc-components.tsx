"use client";

import { FileCode } from "lucide-react";
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
  @keyframes glass-text-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

export function HighlightStyles() {
  return (
    <style jsx global>
      {HIGHLIGHT_STYLES}
    </style>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
  highlight?: string | string[];
  highlightMode?: "line" | "text";
}

function buildMetaProps(
  code: string,
  highlight: string | string[] | undefined,
  highlightMode: "line" | "text",
): { meta?: { __raw: string } } {
  if (!highlight) return {};
  const highlights = Array.isArray(highlight) ? highlight : [highlight];

  if (highlightMode === "text") {
    return { meta: { __raw: highlights.map((h) => `/${h}/`).join(" ") } };
  }

  const lineNumbers = code
    .split("\n")
    .flatMap((line, i) =>
      highlights.some((h) => line.includes(h)) ? [i + 1] : [],
    );

  if (lineNumbers.length === 0) return {};
  return { meta: { __raw: `{${lineNumbers.join(",")}}` } };
}

export function CodeBlock({
  language,
  code,
  highlight,
  highlightMode = "line",
}: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      code={code}
      {...buildMetaProps(code, highlight, highlightMode)}
      addDefaultStyles={false}
      className="[--padding-left:1.5rem] [&_code]:block [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:bg-transparent! [&_pre]:px-0 [&_pre]:py-4"
      transformers={[
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
      ]}
      components={{
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Pre: ({
          className,
          ...props
        }: React.HTMLAttributes<HTMLPreElement>) => (
          <pre className={className} {...props} />
        ),
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
          <code className={className} {...props} />
        ),
      }}
    />
  );
}

export function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

export function BoxTitle({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-2 bg-muted/40 p-6">
      <h3 className="font-mono text-lg">{title}</h3>
      <p className="max-w-[70ch] text-muted-foreground text-sm">
        {description}
      </p>
    </div>
  );
}

export function BoxContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function BoxCodeHeader({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 font-medium font-mono text-sm">
      <FileCode className="size-4 text-muted-foreground" />
      {fileName}
    </div>
  );
}

export function BoxCode({ children }: { children: React.ReactNode }) {
  return <div className="p-2 text-sm">{children}</div>;
}
