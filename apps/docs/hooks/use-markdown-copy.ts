"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export function useMarkdownCopy(markdownUrl: string | undefined) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    hasFetched.current = false;
    setContent(null);
  }, [markdownUrl]);

  const prefetch = useCallback(() => {
    if (!markdownUrl || hasFetched.current) return;
    hasFetched.current = true;
    setIsLoading(true);
    fetch(markdownUrl)
      .then((res) => res.text())
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setIsLoading(false));
  }, [markdownUrl]);

  const copy = useCallback(() => {
    if (!content) {
      toast.error("Content not loaded yet");
      return;
    }
    navigator.clipboard
      .writeText(content)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  }, [content]);

  return { copy, prefetch, isLoading };
}
