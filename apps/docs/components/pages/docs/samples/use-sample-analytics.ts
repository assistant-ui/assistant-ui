"use client";

import { useCallback, useRef } from "react";
import {
  analytics,
  type DocsSampleAction,
  type DocsSampleName,
} from "@/lib/analytics";

/**
 * Reports that a reader used a live docs sample: one `docs_sample_interacted`
 * event per kind of action per sample on the page, so a reader who streams
 * fifty chunks counts once. The event carries the sample's name and the
 * action, never what the reader typed or any thread or message id.
 */
export function useSampleAnalytics(sample: DocsSampleName) {
  const reported = useRef<Set<string>>(null);
  return useCallback(
    (action: DocsSampleAction) => {
      // A reader may accept analytics after their first try, so an action
      // reported while PostHog was off is reported again once it is on.
      const key = `${action}:${window.posthog?.capturing?.() === true}`;
      reported.current ??= new Set();
      if (reported.current.has(key)) return;
      reported.current.add(key);
      analytics.docs.sampleInteracted(sample, action);
    },
    [sample],
  );
}
