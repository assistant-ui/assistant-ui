"use client";

import { PromptCopyButton } from "@/components/shared/prompt-copy-button";
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
  return (
    <PromptCopyButton
      text={AGENT_SETUP_PROMPT}
      label="Copy the setup prompt for your coding agent"
      onCopy={() => analytics.cta.promptCopied({ page, section })}
    >
      Set up assistant-ui with{" "}
      <span className="text-foreground font-mono text-[12.5px] [overflow-wrap:anywhere] [font-variant-ligatures:none]">
        {AGENT_SETUP_COMMAND}
      </span>
    </PromptCopyButton>
  );
}
