"use client";

import { analytics, type AnalyticsProperties } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export function CopyCommandButton({
  command = "npx assistant-ui init",
  analyticsContext,
}: {
  command?: string;
  analyticsContext?: AnalyticsProperties;
}) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  const copyCommand = () => {
    copyToClipboard(command);
    analytics.cta.npmCommandCopied(command, analyticsContext);
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

  return (
    <button type="button" onClick={copyCommand} className={wrapperClassName}>
      <span>{command}</span>
      <div className="ml-1">{copyIcon}</div>
    </button>
  );
}
