"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function PricingAnalytics() {
  useEffect(() => {
    analytics.pricing.pageViewed();
  }, []);

  return null;
}
