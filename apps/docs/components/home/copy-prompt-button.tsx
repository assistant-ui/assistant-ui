"use client";

import { analytics, type AnalyticsProperties } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { SETUP_PROMPT } from "./setup-prompt";

export function CopyPromptButton({
  analyticsContext,
}: {
  analyticsContext?: AnalyticsProperties;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SETUP_PROMPT);
    analytics.cta.promptCopied(analyticsContext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copyToClipboard}
      className="group inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-sm transition-all hover:border-border hover:bg-muted/50"
      aria-label="Copy setup prompt for AI coding agents"
    >
      <div className="relative flex size-4 items-center justify-center">
        <CheckIcon
          className={cn(
            "absolute size-3.5 text-green-500 transition-all duration-100",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <SparklesIcon
          className={cn(
            "absolute size-3.5 text-foreground/70 transition-all duration-100 group-hover:text-foreground",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
        />
      </div>
      <span>Copy prompt</span>
    </button>
  );
}
