"use client";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { memo, useId, useState, useEffect, type FC } from "react";
import { CodeBlock } from "@/components/workbench/code-block";
import { cn } from "@/lib/ui/cn";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={sdkGuideComponents}
    />
  );
};

export const SDKGuideMarkdownText = memo(MarkdownTextImpl);

const SETTLE_DELAY_MS = 150;

const MarkdownCodeBlock: FC<CodeHeaderProps> = ({ language, code }) => {
  const id = useId();
  const [isSettled, setIsSettled] = useState(false);
  const [prevCode, setPrevCode] = useState(code);

  if (code !== prevCode) {
    setIsSettled(false);
    setPrevCode(code);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsSettled(true);
    }, SETTLE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [code]);

  if (!isSettled) {
    return (
      <div className="my-4 first:mt-0 last:mb-0">
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto bg-white text-sm dark:bg-[#24292e]">
            <pre className="p-4">
              <code className="font-mono">{code}</code>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 first:mt-0 last:mb-0">
      <CodeBlock
        id={id}
        code={code}
        language={language || "text"}
        showLineNumbers={false}
        className="[&>div]:shadow-none"
      />
    </div>
  );
};

function InlineCode({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const isCodeBlock = useIsMarkdownCodeBlock();
  if (isCodeBlock) return null;

  return (
    <code
      className={cn(
        "aui-md-inline-code rounded border bg-muted px-1 py-0.5 font-mono text-sm",
        className,
      )}
      {...props}
    />
  );
}

const sdkGuideComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mb-4 scroll-m-20 font-bold text-xl tracking-tight last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-6 mb-3 scroll-m-20 font-semibold text-lg tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-4 mb-2 scroll-m-20 font-semibold text-base tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-4 mb-2 scroll-m-20 font-semibold text-sm tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("aui-md-p mt-3 mb-3 first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "aui-md-a font-medium text-primary underline underline-offset-4",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-l-2 pl-4 text-muted-foreground italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn("aui-md-ul my-3 ml-4 list-disc [&>li]:mt-1.5", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol my-3 ml-4 list-decimal [&>li]:mt-1.5",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("aui-md-hr my-4 border-b", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table
        className={cn(
          "aui-md-table w-full border-separate border-spacing-0 text-sm",
          className,
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th bg-muted px-3 py-1.5 text-left font-semibold text-xs first:rounded-tl-md last:rounded-tr-md",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td border-b border-l px-3 py-1.5 text-left last:border-r",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "aui-md-tr [&:last-child>td:first-child]:rounded-bl-md [&:last-child>td:last-child]:rounded-br-md",
        className,
      )}
      {...props}
    />
  ),
  // CodeHeader receives language and code from the markdown primitive
  CodeHeader: MarkdownCodeBlock,
  // Hide the default pre/code since CodeBlock handles everything
  pre: () => null,
  code: InlineCode,
});
