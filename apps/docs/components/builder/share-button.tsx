"use client";

import { useState, useCallback } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({ className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    analytics.builder.shareClicked();
    const url = window.location.href;

    // Try Web Share API on mobile
    if (navigator.share && /mobile|android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: "assistant-ui Playground",
          text: "Check out my chat UI configuration",
          url,
        });
        return;
      } catch {
        // User cancelled or not supported, fall through to copy
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
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
