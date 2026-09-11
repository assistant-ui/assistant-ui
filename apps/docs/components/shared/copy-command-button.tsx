"use client";

import { analytics, type AnalyticsProperties } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { BotIcon, CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
    "group border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 inline-flex h-8 w-fit items-center gap-1.5 rounded-control border px-3 font-mono text-sm transition-all";

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
        <span>{command}</span>
        <div className="ml-1">{copyIcon}</div>
      </button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <Menu.Trigger
        aria-label="Copy options"
        render={
          <button
            type="button"
            className={cn(wrapperClassName, "cursor-pointer")}
          />
        }
      >
        <span>{command}</span>
        <div className="ml-1">{copyIcon}</div>
      </Menu.Trigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={copyCommand}>
          <TerminalIcon className="size-3.5" />
          Copy CLI command
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyPrompt}>
          <BotIcon className="size-3.5" />
          Copy coding agent prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
