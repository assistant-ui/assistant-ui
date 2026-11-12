"use client";

import { VARIANTS_SETUP_PROMPT } from "@/components/shared/variants-setup-prompt";
import { PromptCopyButton } from "@/components/shared/prompt-copy-button";
import { analytics } from "@/lib/analytics";
import { Typed } from "./typed";

export function CopyPrompt({ section }: { section: string }) {
  return (
    <PromptCopyButton
      text={VARIANTS_SETUP_PROMPT}
      label="Copy the installation prompt for your coding agent"
      onCopy={() => analytics.cta.promptCopied({ page: "variants", section })}
    >
      Install the <Typed>@assistant-ui/variants</Typed> package and set up the{" "}
      <Typed>/variants</Typed> skill.
    </PromptCopyButton>
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
