"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuiState } from "@assistant-ui/react";
import { analytics } from "@/lib/analytics";

type XuluxAnalyticsProperty = string | number | boolean | undefined;

type XuluxAnalyticsContextValue = {
  sessionId: string;
  threadId: string | undefined;
  pathname: string;
};

const XuluxAnalyticsContext = createContext<XuluxAnalyticsContextValue | null>(
  null,
);

export function useXuluxAnalytics() {
  const ctx = useContext(XuluxAnalyticsContext);
  if (!ctx)
    throw new Error("useXuluxAnalytics requires XuluxAnalyticsProvider");
  return ctx;
}

export function XuluxAnalyticsProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const threadId = useAuiState((s) => s.threadListItem.remoteId);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/playground";
  const value = useMemo(
    () => ({ sessionId, threadId, pathname }),
    [pathname, sessionId, threadId],
  );

  return (
    <XuluxAnalyticsContext.Provider value={value}>
      {children}
    </XuluxAnalyticsContext.Provider>
  );
}

export function withXuluxContext<
  T extends Record<string, XuluxAnalyticsProperty>,
>(ctx: XuluxAnalyticsContextValue, extra: T) {
  return {
    session_id: ctx.sessionId,
    ...(ctx.threadId ? { thread_id: ctx.threadId } : {}),
    pathname: ctx.pathname,
    ...extra,
  };
}

export function getXuluxTemplateAnalyticsId(template: {
  id: string;
  templateId?: string | undefined;
}) {
  return template.templateId ?? template.id;
}

export function trackXuluxDownload(
  ctx: XuluxAnalyticsContextValue,
  props: {
    surface: "open_in_card" | "canvas" | "detail_modal";
    download_type: "template" | "sandbox" | "demo";
    template_id?: string;
  },
) {
  analytics.xulux.converted(
    withXuluxContext(ctx, {
      action: "download",
      ...props,
    }),
  );
}
