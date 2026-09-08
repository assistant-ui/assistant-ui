"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/docs-page-actions";

export function useMarkdownCopy(markdownUrl: string | undefined) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  const prefetch = useCallback(() => {
    if (!markdownUrl || hasFetched.current) return;
    hasFetched.current = true;
    setIsLoading(true);
    fetch(markdownUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setIsLoading(false));
  }, [markdownUrl]);

  const copy = useCallback(() => {
    if (!content) {
      toast.error("Content not loaded yet");
      return;
    }
    void copyTextToClipboard(content).then((copied) => {
      if (copied) {
        toast.success("Copied to clipboard");
      } else {
        toast.error("Failed to copy");
      }
    });
  }, [content]);

  return { copy, prefetch, isLoading };
}
