"use client";

import { useState, useEffect, useRef } from "react";

interface BundleState {
  loading: boolean;
  error: string | null;
  bundle: string | null;
}

const bundleCache = new Map<string, string>();

export function useWidgetBundle(componentId: string): BundleState {
  const [state, setState] = useState<BundleState>(() => {
    const cached = bundleCache.get(componentId);
    if (cached) {
      return { loading: false, error: null, bundle: cached };
    }
    return { loading: true, error: null, bundle: null };
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = bundleCache.get(componentId);
    if (cached) {
      setState({ loading: false, error: null, bundle: cached });
      return;
    }

    setState({ loading: true, error: null, bundle: null });

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchBundle() {
      try {
        const response = await fetch(
          `/api/workbench/bundle?id=${encodeURIComponent(componentId)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const bundle = await response.text();
        bundleCache.set(componentId, bundle);
        setState({ loading: false, error: null, bundle });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setState({ loading: false, error: message, bundle: null });
      }
    }

    fetchBundle();

    return () => {
      controller.abort();
    };
  }, [componentId]);

  return state;
}

export function invalidateBundleCache(componentId?: string) {
  if (componentId) {
    bundleCache.delete(componentId);
  } else {
    bundleCache.clear();
  }
}
