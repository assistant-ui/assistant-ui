"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "react-shiki/css";

import {
  StreamdownTextPrimitive,
  type StreamdownTextComponents,
  type SyntaxHighlighterProps,
} from "@assistant-ui/react-streamdown";
import { type CodeHeaderProps } from "@assistant-ui/react-markdown";
import { OpenInSyntaxHighlighter } from "@/components/xulux/chat/OpenInCard";
import { XuluxAskQuestion } from "@/components/xulux/chat/XuluxAskQuestion";
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
import { parseXuluxFileReference } from "@/lib/xulux/learn/file-reference";
import { LearnInlineFileReference } from "../learn/LearnFileView";
import { compactMarkdownComponents } from "@/components/pages/docs/assistant/compact-markdown-components";

const XuluxMarkdownTextImpl = () => {
  return (
    <StreamdownTextPrimitive
      containerClassName="aui-md-assistant"
      preprocess={replaceCourseFileReferences}
      components={markdownComponents as StreamdownTextComponents}
      componentsByLanguage={{
        "open-in": {
          SyntaxHighlighter: OpenInSyntaxHighlighter,
          CodeHeader: () => null,
        },
        "ask-question": {
          SyntaxHighlighter: XuluxAskQuestion,
          CodeHeader: () => null,
        },
        text: {
          SyntaxHighlighter: PlainTextSyntaxHighlighter,
        },
      }}
    />
  );
};

export const XuluxMarkdownText = memo(XuluxMarkdownTextImpl);

const LEARN_FILE_REFERENCE_FRAGMENT_PREFIX = "#xulux-file:course:";
const LEARN_FILE_REFERENCE_PATTERN = /`(xulux-file:course:[^`\n]+)`/g;

function replaceCourseFileReferences(text: string) {
  return text.replace(LEARN_FILE_REFERENCE_PATTERN, (match, token: string) => {
    const reference = parseXuluxFileReference(token);
    if (!reference) return match;
    return `[${reference.path}](${LEARN_FILE_REFERENCE_FRAGMENT_PREFIX}${encodeURIComponent(reference.path)})`;
  });
}

function parseLearnFileReferenceFragment(href: string) {
  if (!href.startsWith(LEARN_FILE_REFERENCE_FRAGMENT_PREFIX)) return null;
  try {
    return parseXuluxFileReference(
      `xulux-file:course:${decodeURIComponent(
        href.slice(LEARN_FILE_REFERENCE_FRAGMENT_PREFIX.length),
      )}`,
    );
  } catch {
    return null;
  }
}

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
      className="[&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:m-0 [&_pre]:scrollbar-none [&_pre]:overflow-x-auto [&_pre]:rounded-t-none [&_pre]:rounded-b-lg [&_pre]:border [&_pre]:border-t-0 [&_pre]:py-3 [&_pre]:pr-3 [&_pre]:pl-1 [&_pre]:text-xs [&_pre]:leading-relaxed"
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

const PlainTextSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code }) => {
  return (
    <pre className="border-border/50 bg-muted/30 !mt-0 max-w-full overflow-x-hidden rounded-t-none rounded-b-lg border border-t-0 px-3 py-2 text-xs leading-normal whitespace-pre-wrap">
      <code className="break-words whitespace-pre-wrap">{code.trim()}</code>
    </pre>
  );
};

const markdownComponents = {
  SyntaxHighlighter: SyntaxHighlighter,
  ...compactMarkdownComponents,
  a: ({
    className,
    href,
    children,
    title,
    target,
    rel,
  }: ComponentPropsWithoutRef<"a">) => {
    const reference = href ? parseLearnFileReferenceFragment(href) : null;
    if (reference) {
      return (
        <LearnInlineFileReference reference={reference} className={className} />
      );
    }

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
  pre: ({ className, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className={cn(
        "border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  CodeHeader,
};
