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
  const pendingRef = useRef<{
    url: string;
    promise: Promise<string>;
  } | null>(null);

  const loadMarkdown = useCallback(() => {
    if (!markdownUrl) return;
    if (loaded?.url === markdownUrl) return Promise.resolve(loaded.content);
    if (pendingRef.current?.url === markdownUrl) {
      return pendingRef.current.promise;
    }

    const requestId = ++requestIdRef.current;
    setLoadingUrl(markdownUrl);
    const promise = fetch(markdownUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((content) => {
        if (requestId === requestIdRef.current) {
          setLoaded({ url: markdownUrl, content });
        }
        return content;
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        pendingRef.current = null;
        setLoadingUrl(null);
      });
    pendingRef.current = { url: markdownUrl, promise };
    return promise;
  }, [loaded, markdownUrl]);

  const prefetch = useCallback(() => {
    void loadMarkdown()?.catch(() => {});
  }, [loadMarkdown]);

  const copy = useCallback(() => {
    const copyContent = (content: string) => {
      void copyTextToClipboard(content).then((copied) => {
        if (copied) {
          toast.success("Copied to clipboard");
        } else {
          toast.error("Failed to copy");
        }
      });
    };

    if (loaded && loaded.url === markdownUrl) {
      copyContent(loaded.content);
    } else {
      void loadMarkdown()?.then(copyContent, () => {
        toast.error("Failed to load Markdown. Please try again.");
      });
    }
  }, [loaded, loadMarkdown, markdownUrl]);

  return { copy, prefetch, isLoading: loadingUrl === markdownUrl };
}
