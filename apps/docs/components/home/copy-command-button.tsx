"use client";

import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export function CopyCommandButton({
  command = "npx assistant-ui init",
  analyticsContext,
}: {
  command?: string;
  analyticsContext?: Record<string, string | number | boolean>;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    analytics.cta.npmCommandCopied(command, analyticsContext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-sm transition-all hover:border-border hover:bg-muted/50"
    >
      <span className="text-muted-foreground/70">$</span>
      <span>{command}</span>
      <div className="relative ml-1 flex size-4 items-center justify-center text-muted-foreground">
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
    </button>
  );
}
