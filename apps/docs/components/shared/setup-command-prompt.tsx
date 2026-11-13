"use client";

import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Link } from "@farm.js/core/client";
import { toast } from "sonner";
import { PromptCopyButton } from "@/components/shared/prompt-copy-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { agentSetupPrompt } from "@/lib/agent-setup-prompt";

/** The setup prompt for a coding agent, copied on click. */
export function SetupCommandPrompt({
  page,
  section,
  products,
}: {
  page: string;
  section: string;
  /** Catalog slugs the setup starts with; the bare prompt when omitted. */
  products?: readonly string[];
}) {
  const prompt = agentSetupPrompt(products);
  return (
    <PromptCopyButton
      text={prompt}
      label="Copy the setup prompt for your coding agent"
      onCopy={() => analytics.cta.promptCopied({ page, section })}
    >
      Tell your coding agent:{" "}
      <span className="text-foreground font-mono text-[12.5px] [overflow-wrap:anywhere] [font-variant-ligatures:none]">
        {prompt}
      </span>
    </PromptCopyButton>
  );
}

/** The way around the agent: the installation docs. */
export function InstallManuallyLink({ section }: { section: string }) {
  return (
    <Link
      href="/docs/installation"
      onClick={() => analytics.cta.clicked("start_setup_manual", section)}
      className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors hover:underline"
    >
      Install manually
    </Link>
  );
}

/** Any trigger that copies a product's setup prompt for the reader's coding agent. */
export function SetupPromptTrigger({
  children,
  page,
  section,
  products,
  notes,
  trigger,
}: {
  children: ReactNode;
  page: string;
  section: string;
  products?: readonly string[];
  notes?: string;
  trigger: ReactElement<{ onClick?: () => void; children?: ReactNode }>;
}) {
  const { copyToClipboard } = useCopyToClipboard();
  const ownClick = trigger.props.onClick;
  return cloneElement(trigger, {
    onClick: () => {
      ownClick?.();
      copyToClipboard(agentSetupPrompt(products, notes));
      analytics.cta.promptCopied({ page, section });
      toast.success("Setup prompt copied. Paste it into your coding agent.");
    },
    children,
  });
}
