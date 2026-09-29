"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({ className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const scopeGenerationRef = useRef(0);

  useEffect(
    () => () => {
      scopeGenerationRef.current += 1;
      if (copiedTimerRef.current === undefined) return;

      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = undefined;
      setCopied(false);
    },
    [],
  );

  const handleShare = useCallback(async () => {
    analytics.builder.shareClicked();
    const url = window.location.href;
    const scopeGeneration = scopeGenerationRef.current;

    if (navigator.share && /mobile|android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: "assistant-ui Playground",
          text: "Check out my chat UI configuration",
          url,
        });
        return;
      } catch {
        // A cancelled or unsupported share falls through to the clipboard copy.
      }
    }

    if (await copyTextToClipboard(url)) {
      if (scopeGeneration !== scopeGenerationRef.current) return;

      clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => {
        copiedTimerRef.current = undefined;
        setCopied(false);
      }, 2000);
    } else {
      toast.error("Failed to copy");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
        copied
          ? "bg-green-500/10 text-green-600 dark:text-green-400"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      title={copied ? "Link copied to clipboard" : "Copy shareable link"}
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          <span className="hidden sm:inline">Copied!</span>
        </>
      ) : (
        <>
          <Link2 className="size-3.5" />
          <span className="hidden sm:inline">Share</span>
        </>
      )}
    </button>
  );
}
