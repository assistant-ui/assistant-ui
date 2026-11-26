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
  const reported = useRef<Set<DocsSampleAction>>(null);
  return useCallback(
    (action: DocsSampleAction) => {
      reported.current ??= new Set();
      if (reported.current.has(action)) return;
      reported.current.add(action);
      analytics.docs.sampleInteracted(sample, action);
    },
    [sample],
  );
}
