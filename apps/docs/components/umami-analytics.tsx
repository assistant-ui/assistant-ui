"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { isSampledSession } from "@/lib/umami-sampling";

const WEBSITE_ID = "6f07c001-46a2-411f-9241-4f7f5afb60ee";
const DOMAINS = "www.assistant-ui.com";

export const UmamiAnalytics = () => {
  const [sampled, setSampled] = useState(false);

  useEffect(() => {
    setSampled(isSampledSession());
  }, []);

  if (!sampled) return null;

  return (
    <Script
      src="/umami/script.js"
      data-website-id={WEBSITE_ID}
      data-domains={DOMAINS}
    />
  );
};
