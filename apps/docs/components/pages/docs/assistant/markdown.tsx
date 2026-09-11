"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  MarkdownTextPrimitive,
  type SyntaxHighlighterProps,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import {
  type FC,
  type ReactNode,
  memo,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import ShikiHighlighter from "react-shiki";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md-assistant"
      components={markdownComponents}
      defer
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CollapsibleCode: FC<{ children: ReactNode }> = ({ children }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      setOverflowing(content.scrollHeight > 320);
    });

    observer.observe(content);
    setOverflowing(content.scrollHeight > 320);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(overflowing && !expanded && "relative")}
    >
      <div
        ref={contentRef}
        id={contentId}
        className={cn(overflowing && !expanded && "max-h-64 overflow-hidden")}
      >
        {children}
      </div>
      {overflowing && !expanded && (
        <>
          <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-lg bg-gradient-to-t to-transparent" />
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <button
              type="button"
              aria-expanded={false}
              aria-controls={contentId}
              onClick={() => setExpanded(true)}
              className="text-muted-foreground hover:text-foreground bg-background/90 pointer-events-auto rounded-full border px-3 py-1 text-xs backdrop-blur"
            >
              Show more
            </button>
          </div>
        </>
      )}
      {overflowing && expanded && (
        <div className="flex justify-center">
          <button
            type="button"
            aria-expanded={true}
            aria-controls={contentId}
            onClick={() => {
              setExpanded(false);
              containerRef.current?.scrollIntoView({ block: "nearest" });
            }}
            className="text-muted-foreground hover:text-foreground bg-background/90 mt-1 rounded-full border px-3 py-1 text-xs backdrop-blur"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
};

const codeSheetReset =
  "[&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent! [&_pre]:px-3.5 [&_pre]:py-0 [&_pre]:text-[12.5px] [&_pre]:overflow-visible";

const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code, language }) => {
  const trimmed = code.trim();
  return (
    <CollapsibleCode>
      <CodeBlock
        title={language || undefined}
        copyText={code}
        lineNumbers
        className="my-2.5"
      >
        <ShikiHighlighter
          language={language}
          theme={{ dark: "github-dark-default", light: "github-light-default" }}
          addDefaultStyles={false}
          showLanguage={false}
          defaultColor={false}
          className={codeSheetReset}
        >
          {trimmed}
        </ShikiHighlighter>
      </CodeBlock>
    </CollapsibleCode>
  );
};

const markdownComponents = memoizeMarkdownComponents({
  SyntaxHighlighter: SyntaxHighlighter,
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mb-2 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, href, children, title, target, rel }) => {
    const linkClass = cn(
      "text-primary hover:text-primary/80 underline underline-offset-2",
      className,
    );

    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={linkClass} title={title} target={target}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className={linkClass}
        title={title}
        target={target}
        rel={rel}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "border-muted-foreground/30 text-muted-foreground my-2.5 border-l-2 pl-3 italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("border-muted-foreground/20 my-2", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-xs", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-muted-foreground/20 bg-muted border px-2 py-1 text-left font-medium",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border-muted-foreground/20 border px-2 py-1 text-left",
        className,
      )}
      {...props}
    />
  ),
  tr: (props) => <tr {...props} />,
  pre: ({ className, children, ...props }) => (
    <CollapsibleCode>
      <CodeBlock className="my-2.5">
        <pre className={cn("overflow-visible", className)} {...props}>
          {children}
        </pre>
      </CodeBlock>
    </CollapsibleCode>
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader: () => null,
});
