"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  CodeHeaderProps,
  MarkdownTextPrimitiveServer,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
  type Root,
} from "@assistant-ui/react-markdown";
// import remarkGfm from "remark-gfm";
import { FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const MarkdownTextImpl = ({ hast }: { hast?: Root | undefined }) => {
  return (
    <MarkdownTextPrimitiveServer
      // remarkPlugins={[remarkGfm]}
      className="aui-md"
      // components={defaultComponents}
      hast={hast}
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
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
      <span className="lowercase [&>span]:text-xs">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

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

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn("aui-md-h1", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("aui-md-h2", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("aui-md-h3", className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("aui-md-h4", className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn("aui-md-h5", className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn("aui-md-h6", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("aui-md-p", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("aui-md-a", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn("aui-md-blockquote", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("aui-md-ul", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("aui-md-ol", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("aui-md-hr", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table className={cn("aui-md-table", className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th className={cn("aui-md-th", className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("aui-md-td", className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn("aui-md-tr", className)} {...props} />
  ),
  sup: ({ className, ...props }) => (
    <sup className={cn("aui-md-sup", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn("aui-md-pre", className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(!isCodeBlock && "aui-md-inline-code", className)}
        {...props}
      />
    );
  },
  CodeHeader,
});
