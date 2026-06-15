"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";

export type Unstable_UseLiveCompletionAdapterOptions = {
  /**
   * Fetches the items for a query from an async source. Called debounced; the
   * resolved items are cached and returned synchronously to the popover on the
   * next render.
   */
  readonly fetcher: (query: string) => Promise<readonly Unstable_TriggerItem[]>;
  /** Debounce applied before a fetch fires, in milliseconds. @default 60 */
  readonly debounceMs?: number | undefined;
  /** When `false`, no fetch is scheduled and the adapter stays empty. @default true */
  readonly enabled?: boolean | undefined;
};

/** Sentinel that no real query (including the empty string) equals, so the first query always fetches. */
const NO_QUERY = "\u0000";

/**
 * @deprecated Under active development and may change without notice.
 *
 * Bridges an async completion source (a server search, a gateway RPC) into the
 * synchronous `Unstable_TriggerAdapter` that `ComposerTriggerPopover` consumes.
 * `search(query)` returns the last fetched items synchronously and schedules a
 * debounced fetch when the query changes; when results arrive the returned
 * `adapter` identity changes, which re-runs the popover's lookup so the fresh
 * items render. This is a search-only adapter (`categories` are empty).
 *
 * `isLoading` is `true` while a fetch is in flight. Pass it to the popover's
 * `isLoading` prop to render a loading state.
 *
 * @example
 * ```tsx
 * const mentions = unstable_useLiveCompletionAdapter({
 *   fetcher: (query) => searchUsers(query),
 * });
 *
 * <ComposerTriggerPopover
 *   char="@"
 *   adapter={mentions.adapter}
 *   isLoading={mentions.isLoading}
 *   directive={{ onInserted }}
 * />
 * ```
 */
export function unstable_useLiveCompletionAdapter(
  options: Unstable_UseLiveCompletionAdapterOptions,
): { adapter: Unstable_TriggerAdapter; isLoading: boolean } {
  const { fetcher, debounceMs = 60, enabled = true } = options;

  const [state, setState] = useState<{
    query: string;
    items: readonly Unstable_TriggerItem[];
  }>({ query: NO_QUERY, items: [] });
  const [isLoading, setIsLoading] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(0);
  const pendingQueryRef = useRef<string | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleFetch = useCallback(
    (query: string) => {
      if (!enabled) return;
      if (pendingQueryRef.current === query) return;
      pendingQueryRef.current = query;
      cancelTimer();
      const token = ++tokenRef.current;
      setIsLoading(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fetcherRef.current(query).then(
          (items) => {
            if (token !== tokenRef.current) return;
            setState({ query, items });
            setIsLoading(false);
          },
          () => {
            if (token !== tokenRef.current) return;
            setState({ query, items: [] });
            setIsLoading(false);
          },
        );
      }, debounceMs);
    },
    [enabled, debounceMs, cancelTimer],
  );

  useEffect(() => {
    if (enabled) return;
    cancelTimer();
    pendingQueryRef.current = null;
    tokenRef.current += 1;
    setIsLoading(false);
  }, [enabled, cancelTimer]);

  useEffect(() => cancelTimer, [cancelTimer]);

  const adapter = useMemo<Unstable_TriggerAdapter>(
    () => ({
      categories: () => [],
      categoryItems: () => [],
      search: (query: string) => {
        if (query !== state.query) scheduleFetch(query);
        return state.items;
      },
    }),
    [state, scheduleFetch],
  );

  return useMemo(() => ({ adapter, isLoading }), [adapter, isLoading]);
}
