"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "@assistant-ui/react-markdown/styles/typeset.css";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md typeset [--typeset-flow:1em] [--typeset-leading:1.6]"
      components={defaultComponents}
      defer
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
    // Sized in em with /0.75 compensation so the header sits on the typeset
    // flow rhythm and lines up with the pre block below it (0.875em type,
    // 1em padding), mirroring how typeset.css scales pre itself.
    <div className="aui-code-header-root bg-muted border-border/50 mt-[calc(var(--typeset-flow)/0.75)] flex items-center justify-between rounded-t-lg border-b px-[calc(0.875em/0.75)] py-1.5 text-[0.75em] first:mt-0">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">
        {language}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && (
          <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
        )}
        {isCopied && (
          <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
        )}
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
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(value).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  pre: ({ className, ...props }) => (
    <pre
      className={cn("aui-md-pre mt-0 rounded-t-none", className)}
      {...props}
    />
  ),
  CodeHeader,
});
