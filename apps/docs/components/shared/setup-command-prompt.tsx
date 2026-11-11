"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import {
  AGENT_SETUP_COMMAND,
  AGENT_SETUP_PROMPT,
} from "@/lib/agent-setup-prompt";

/** The one-line setup prompt for a coding agent, copied on click. */
export function SetupCommandPrompt({
  page,
  section,
}: {
  page: string;
  section: string;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      title={AGENT_SETUP_PROMPT}
      aria-label="Copy the setup prompt for your coding agent"
      onClick={() => {
        copyToClipboard(AGENT_SETUP_PROMPT);
        analytics.cta.promptCopied({ page, section });
      }}
      className="group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 rounded-control focus-visible:ring-ring inline-flex max-w-full items-center gap-3 border py-2 pr-2.5 pl-3.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        Set up assistant-ui with{" "}
        <span className="text-foreground font-mono text-[12.5px] whitespace-nowrap [font-variant-ligatures:none]">
          {AGENT_SETUP_COMMAND}
        </span>
      </span>
      <span
        aria-hidden
        className="text-muted-foreground group-hover:text-foreground grid size-6 shrink-0 place-items-center transition-colors"
      >
        {isCopied ? (
          <CheckIcon className="size-3.5 text-green-500" />
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
