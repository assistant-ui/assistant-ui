"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "react-shiki/css";

import {
  StreamdownTextPrimitive,
  useIsStreamdownCodeBlock,
  type StreamdownTextComponents,
  type SyntaxHighlighterProps,
} from "@assistant-ui/react-streamdown";
import { type CodeHeaderProps } from "@assistant-ui/react-markdown";
import { OpenInSyntaxHighlighter } from "@/components/xulux/chat/OpenInCard";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
  memo,
} from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ShikiHighlighter from "react-shiki";
import Link from "next/link";
import { useCopyToClipboard } from "@assistant-ui/ui/hooks/use-copy-to-clipboard";

const MarkdownTextImpl = () => {
  return (
    <StreamdownTextPrimitive
      containerClassName="aui-md-assistant"
      components={markdownComponents as StreamdownTextComponents}
      componentsByLanguage={{
        "open-in": {
          SyntaxHighlighter: OpenInSyntaxHighlighter,
          CodeHeader: () => null,
        },
      }}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="border-border/50 bg-muted/50 mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground font-medium lowercase">
        {language}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded-md transition-colors"
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
      className="[&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:scrollbar-none [&_pre]:overflow-x-auto [&_pre]:rounded-t-none [&_pre]:rounded-b-lg [&_pre]:border [&_pre]:border-t-0 [&_pre]:py-3 [&_pre]:pr-3 [&_pre]:pl-1 [&_pre]:text-xs [&_pre]:leading-relaxed"
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

const markdownComponents = {
  SyntaxHighlighter: SyntaxHighlighter,
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className={cn(
        "mb-2 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: ComponentPropsWithoutRef<"h5">) => (
    <h5
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: ComponentPropsWithoutRef<"h6">) => (
    <h6
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({
    className,
    href,
    children,
    title,
    target,
    rel,
  }: ComponentPropsWithoutRef<"a">) => {
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
  blockquote: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className={cn(
        "border-muted-foreground/30 text-muted-foreground my-2.5 border-l-2 pl-3 italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr
      className={cn("border-muted-foreground/20 my-2", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="my-2 overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-xs", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th
      className={cn(
        "border-muted-foreground/20 bg-muted border px-2 py-1 text-left font-medium",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td
      className={cn(
        "border-muted-foreground/20 border px-2 py-1 text-left",
        className,
      )}
      {...props}
    />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => <tr {...props} />,
  pre: ({ className, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className={cn(
        "border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({
    className,
    ...props
  }: ComponentPropsWithoutRef<"code">) {
    const isCodeBlock = useIsStreamdownCodeBlock();
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
  CodeHeader,
};
