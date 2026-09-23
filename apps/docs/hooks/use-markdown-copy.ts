"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export function useMarkdownCopy(markdownUrl: string | undefined) {
  const [loaded, setLoaded] = useState<{
    url: string;
    content: string;
  } | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const pendingUrlRef = useRef<string | null>(null);

  const prefetch = useCallback(() => {
    if (
      !markdownUrl ||
      loaded?.url === markdownUrl ||
      pendingUrlRef.current === markdownUrl
    )
      return;

    const requestId = ++requestIdRef.current;
    pendingUrlRef.current = markdownUrl;
    setLoadingUrl(markdownUrl);
    fetch(markdownUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((content) => {
        if (requestId === requestIdRef.current) {
          setLoaded({ url: markdownUrl, content });
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setLoaded(null);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        pendingUrlRef.current = null;
        setLoadingUrl(null);
      });
  }, [loaded?.url, markdownUrl]);

  const copy = useCallback(() => {
    if (!loaded || loaded.url !== markdownUrl) {
      toast.error("Content not loaded yet");
      return;
    }
    void copyTextToClipboard(loaded.content).then((copied) => {
      if (copied) {
        toast.success("Copied to clipboard");
      } else {
        toast.error("Failed to copy");
      }
    });
  }, [loaded, markdownUrl]);

  return { copy, prefetch, isLoading: loadingUrl === markdownUrl };
}
