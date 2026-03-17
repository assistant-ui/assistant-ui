"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "react-shiki/css";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  type SyntaxHighlighterProps,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type CSSProperties, type FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ShikiHighlighter from "react-shiki";
import Link from "next/link";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md-assistant"
      components={markdownComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="mt-2.5 flex items-center justify-between rounded-t-lg border border-border/50 border-b-0 bg-muted/50 px-3 py-1.5 text-xs">
      <span className="font-medium text-muted-foreground lowercase">
        {language}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {isCopied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
};

const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code, language }) => {
  return (
    <ShikiHighlighter
      language={language}
      theme={{ dark: "github-dark-default", light: "github-light-default" }}
      addDefaultStyles={false}
      showLanguage={false}
      showLineNumbers
      defaultColor={false}
      className="[&_pre]:scrollbar-none [&_pre]:overflow-x-auto [&_pre]:rounded-t-none [&_pre]:rounded-b-lg [&_pre]:border [&_pre]:border-border/50 [&_pre]:border-t-0 [&_pre]:bg-muted/30 [&_pre]:py-3 [&_pre]:pr-3 [&_pre]:pl-1 [&_pre]:text-xs [&_pre]:leading-relaxed"
      style={
        {
          "--line-numbers-foreground": "var(--color-muted-foreground)",
          "--line-numbers-width": "2ch",
          "--line-numbers-padding-left": "0",
          "--line-numbers-padding-right": "1ch",
        } as CSSProperties
      }
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};

const markdownComponents = memoizeMarkdownComponents({
  SyntaxHighlighter: SyntaxHighlighter,
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mb-2 font-semibold text-base first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
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
      "text-primary underline underline-offset-2 hover:text-primary/80",
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
        "my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "my-2 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "my-2 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-1",
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
      className={cn("my-2 border-muted-foreground/20", className)}
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
        "border border-muted-foreground/20 bg-muted px-2 py-1 text-left font-medium",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border border-muted-foreground/20 px-2 py-1 text-left",
        className,
      )}
      {...props}
    />
  ),
  tr: (props) => <tr {...props} />,
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-t-none rounded-b-lg border border-border/50 border-t-0 bg-muted/30 p-3 text-xs leading-relaxed",
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
            "rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});
