"use client";

import { useEffect, useState } from "react";
import {
  shouldSuggestDocsRoute,
  type RoutePage,
  type SearchScope,
} from "@/lib/search/route-query";

export function useSearchSuggestions(
  query: string,
  scope: SearchScope,
  pages: RoutePage[],
) {
  const [result, setResult] = useState<{
    query: string;
    scope: SearchScope;
    pages: RoutePage[];
  } | null>(null);
  const eligible = shouldSuggestDocsRoute(query, pages);
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
          const data = (await response.json()) as { pages: RoutePage[] };
          suggestions = data.pages;
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
