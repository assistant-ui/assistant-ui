"use client";

import { analytics, type AnalyticsProperties } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon, SparklesIcon, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { DropdownMenu as DropdownMenuRadix } from "radix-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/shared/dropdown-menu";
import { SETUP_PROMPT } from "./setup-prompt";

export function CopyCommandButton({
  command = "npx assistant-ui init",
  analyticsContext,
  withPromptOption = false,
}: {
  command?: string;
  analyticsContext?: AnalyticsProperties;
  withPromptOption?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    analytics.cta.npmCommandCopied(command, analyticsContext);
    flash();
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(SETUP_PROMPT);
    analytics.cta.promptCopied(analyticsContext);
    flash();
  };

  const wrapperClassName =
    "group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 inline-flex w-fit items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm transition-all";

  const copyIcon = (
    <div className="text-muted-foreground relative flex size-4 items-center justify-center">
      <CheckIcon
        className={cn(
          "absolute size-3.5 text-green-500 transition-all duration-100",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
      <CopyIcon
        className={cn(
          "absolute size-3.5 transition-all duration-100",
          copied
            ? "scale-50 opacity-0"
            : "scale-100 opacity-50 group-hover:opacity-100",
        )}
      />
    </div>
  );

  if (!withPromptOption) {
    return (
      <button type="button" onClick={copyCommand} className={wrapperClassName}>
        <span className="text-muted-foreground/70">$</span>
        <span>{command}</span>
        <div className="ml-1">{copyIcon}</div>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuRadix.Trigger asChild aria-label="Copy options">
        <button
          type="button"
          className={cn(wrapperClassName, "cursor-pointer")}
        >
          <span className="text-muted-foreground/70">$</span>
          <span>{command}</span>
          <div className="ml-1">{copyIcon}</div>
        </button>
      </DropdownMenuRadix.Trigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          icon={<TerminalIcon className="size-3.5" />}
          onSelect={copyCommand}
        >
          Copy CLI command
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<SparklesIcon className="size-3.5" />}
          onSelect={copyPrompt}
        >
          Copy coding agent prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
