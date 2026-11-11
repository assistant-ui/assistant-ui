"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { AGENT_SETUP_PROMPT } from "@/lib/config";

/** The prompt that starts a setup, copied on click. */
export function PromptCopy() {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      aria-label="Copy the setup prompt for your coding agent"
      onClick={() => copyToClipboard(AGENT_SETUP_PROMPT)}
      className="group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 rounded-control focus-visible:ring-ring inline-flex max-w-full items-center gap-3 border py-2 pr-2.5 pl-3.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="text-muted-foreground group-hover:text-foreground min-w-0 transition-colors">
        Tell your coding agent:{" "}
        <span className="text-foreground font-mono text-[12.5px] [font-variant-ligatures:none]">
          {AGENT_SETUP_PROMPT}
        </span>
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
