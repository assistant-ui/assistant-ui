"use client";

import { useMemo } from "react";
import { usePlatformOrDefault } from "@/components/pages/docs/platform/context";
import { getPlatformMarkdownUrl } from "@/lib/docs-platform";

export function usePlatformMarkdownUrl(
  markdownUrl: string | undefined,
  platformAware: boolean,
): string | undefined {
  const platform = usePlatformOrDefault();

  return useMemo(() => {
    if (!markdownUrl || !platformAware) return markdownUrl;
    return getPlatformMarkdownUrl(markdownUrl, platform);
  }, [markdownUrl, platform, platformAware]);
}
