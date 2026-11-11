"use client";

import type { ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/** A one-line prompt for a coding agent, copied on click. */
export function PromptCopyButton({
  text,
  label,
  onCopy,
  children,
}: {
  /** What lands on the clipboard. */
  text: string;
  /** The button's accessible name. */
  label: string;
  onCopy?: () => void;
  /** The prompt as shown. */
  children: ReactNode;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      title={text}
      aria-label={label}
      onClick={() => {
        copyToClipboard(text);
        onCopy?.();
      }}
      className="group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 rounded-control focus-visible:ring-ring inline-flex max-w-full items-center gap-3 border py-2 pr-2.5 pl-3.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="text-muted-foreground group-hover:text-foreground min-w-0 transition-colors">
        {children}
      </span>
      <span
        aria-hidden
        className="text-muted-foreground group-hover:text-foreground grid size-6 shrink-0 place-items-center transition-colors"
      >
        {isCopied ? (
          <CheckIcon className="text-foreground size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </span>
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}
