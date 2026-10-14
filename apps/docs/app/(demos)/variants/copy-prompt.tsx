"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { VARIANTS_SETUP_PROMPT } from "@/components/shared/variants-setup-prompt";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { Typed } from "./typed";

export function CopyPrompt({ section }: { section: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      title={VARIANTS_SETUP_PROMPT}
      aria-label="Copy the installation prompt for your coding agent"
      onClick={() => {
        copyToClipboard(VARIANTS_SETUP_PROMPT);
        analytics.cta.promptCopied({ page: "variants", section });
      }}
      className="group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 rounded-control focus-visible:ring-ring inline-flex max-w-full items-center gap-3 border py-2 pr-2.5 pl-3.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        Install the <Typed>@assistant-ui/variants</Typed> package and set up the{" "}
        <Typed>/variants</Typed> skill.
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

export function InstallationPrompt({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-muted-foreground text-xs">Installation prompt</p>
      <CopyPrompt section={section} />
    </div>
  );
}
