"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "katex/dist/katex.min.css";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { type ComponentProps, memo } from "react";
import dynamic from "next/dynamic";

import {
  type HighlighterProps,
  SyntaxHighlighter as ShikiSyntaxHighlighter,
} from "@/components/assistant-ui/elements/shiki-highlighter.aui";
import { CodeBlock } from "@/components/ui/code-block";
import { preprocessMath } from "@/lib/markdown-math";
import { cn } from "@/lib/utils";

// The diagram engine only loads once a mermaid fence arrives, so every other
// route that renders markdown keeps it out of its initial chunk.
const LazyMermaidDiagram = dynamic(
  () =>
    import("@/components/assistant-ui/elements/mermaid-diagram.aui").then(
      (mod) => mod.MermaidDiagram,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="aui-mermaid-skeleton bg-muted rounded-b-document h-32 animate-pulse"
      />
    ),
  },
);

// Fenced code and mermaid fences render inside the site's CodeBlock, the same
// code sheet the docs pages use, so the kit highlighter only supplies tokens
// and its own chrome is reset.
const codeSheetReset =
  "[&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent! [&_pre]:px-3.5 [&_pre]:py-0 [&_pre]:text-[12.5px] [&_pre]:overflow-visible";

const SyntaxHighlighter = (props: HighlighterProps) => (
  <CodeBlock
    title={props.language || undefined}
    copyText={props.code}
    className="my-3"
  >
    <ShikiSyntaxHighlighter {...props} className={codeSheetReset} />
  </CodeBlock>
);

const MermaidDiagram = (props: ComponentProps<typeof LazyMermaidDiagram>) => (
  <CodeBlock title="mermaid" copyText={props.code} className="my-3">
    <LazyMermaidDiagram
      {...props}
      className="-my-1.5 rounded-none bg-transparent"
    />
  </CodeBlock>
);

const NoCodeHeader = () => null;

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];
const componentsByLanguage = {
  mermaid: { SyntaxHighlighter: MermaidDiagram },
};

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      componentsByLanguage={componentsByLanguage}
      preprocess={preprocessMath}
      className="aui-md [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1"
      components={defaultComponents}
      defer
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const defaultComponents = memoizeMarkdownComponents({
  SyntaxHighlighter,
  CodeHeader: NoCodeHeader,
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "aui-md-h5 mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "aui-md-h6 mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "aui-md-a text-primary hover:text-primary/80 underline underline-offset-2",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("aui-md-hr border-muted-foreground/20 my-3", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <table
      className={cn(
        "aui-md-table my-3 w-full border-separate border-spacing-0 overflow-y-auto",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] first:rounded-ss-document last:rounded-se-document border-b px-3 py-1.5 text-start font-medium [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td border-foreground/10 border-b px-3 py-1.5 text-start [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn("aui-md-tr m-0 p-0", className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li leading-relaxed", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("aui-md-strong font-semibold", className)}
      {...props}
    />
  ),
  sup: ({ className, ...props }) => (
    <sup
      className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
});
