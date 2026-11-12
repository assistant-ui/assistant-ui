"use client";

import {
  cloneElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDownIcon, CopyIcon, BookOpenIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromptCopyButton } from "@/components/shared/prompt-copy-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { agentSetupPrompt } from "@/lib/agent-setup-prompt";
import {
  hasManualSteps,
  openManualSteps,
} from "@/components/shared/manual-steps";

/** The setup prompt for a coding agent, copied on click, with a menu for the manual steps. */
export function SetupCommandPrompt({
  page,
  section,
  products,
  prompt: promptOverride,
}: {
  page: string;
  section: string;
  /** Catalog slugs the setup starts with; the bare prompt when omitted. */
  products?: readonly string[];
  /** The exact prompt to show and copy, in place of the catalog prompt. */
  prompt?: string;
}) {
  const prompt = promptOverride ?? agentSetupPrompt(products);
  // Checked when the menu opens: a page with its own manual steps opens them
  // in place (an action), any other page links to the manual installation guide.
  const [stepsOnPage, setStepsOnPage] = useState(false);
  const manualClicked = (inPlace: boolean) =>
    analytics.cta.clicked("start_setup_manual", `${section}_menu`, {
      page,
      path: window.location.pathname,
      in_place: inPlace,
    });
  return (
    <div className="border-border/60 bg-muted/30 hover:border-border rounded-control inline-flex max-w-full items-stretch overflow-hidden border transition-colors">
      <PromptCopyButton
        bare
        text={prompt}
        label="Copy the setup prompt for your coding agent"
        onCopy={() => analytics.cta.promptCopied({ page, section })}
      >
        <span className="text-foreground font-mono text-[12.5px] [overflow-wrap:anywhere] [font-variant-ligatures:none]">
          {prompt}
        </span>
      </PromptCopyButton>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          setStepsOnPage(hasManualSteps());
          analytics.cta.setupMenuOpened(section);
        }}
      >
        <DropdownMenuTrigger
          aria-label="More ways to install"
          className="border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring grid w-9 shrink-0 place-items-center border-l transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              // Confirm only once the write lands, so a blocked clipboard never claims a copy.
              Promise.resolve()
                .then(() => navigator.clipboard.writeText(prompt))
                .then(
                  () => {
                    analytics.cta.promptCopied({ page, section });
                    toast.success(
                      "Setup prompt copied. Paste it into your coding agent.",
                    );
                  },
                  () =>
                    toast.error(
                      "Could not copy. Select the prompt and copy it instead.",
                    ),
                );
            }}
          >
            <CopyIcon />
            Copy prompt for coding agents
          </DropdownMenuItem>
          {stepsOnPage ? (
            <DropdownMenuItem
              onClick={() => {
                openManualSteps();
                manualClicked(true);
              }}
            >
              <BookOpenIcon />
              Manual installation steps
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              render={
                <Link
                  href="/docs/manual-installation"
                  onClick={() => manualClicked(false)}
                />
              }
            >
              <BookOpenIcon />
              Manual installation steps
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
