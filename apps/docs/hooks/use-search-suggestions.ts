"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  shouldSuggestDocsRoute,
  type RoutePage,
  type SearchScope,
} from "@/lib/search/route-query";

const responseSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  ),
  enabled: z.boolean().optional(),
});

export function useSearchSuggestions(
  query: string,
  scope: SearchScope,
  pages: RoutePage[],
) {
  const [enabled, setEnabled] = useState(true);
  const [result, setResult] = useState<{
    query: string;
    scope: SearchScope;
    pages: RoutePage[];
  } | null>(null);
  const eligible = enabled && shouldSuggestDocsRoute(query, pages);
  const current = result?.query === query && result.scope === scope;

  useEffect(() => {
    if (!eligible) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let suggestions: RoutePage[] = [];
      try {
        const params = new URLSearchParams({ query, scope });
        const response = await fetch(`/api/search/suggest?${params}`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(3000),
          ]),
        });
        if (response.ok) {
          const data = responseSchema.safeParse(await response.json());
          if (data.success) {
            suggestions = data.data.pages;
            if (data.data.enabled === false && !controller.signal.aborted)
              setEnabled(false);
          }
        }
      } catch {
        // Page and in-page matches remain usable if suggestions are unavailable.
      }
      if (!controller.signal.aborted)
        setResult({ query, scope, pages: suggestions });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, scope, eligible]);

  return {
    pages: eligible && current ? result.pages : [],
    loading: eligible && !current,
  };
}
