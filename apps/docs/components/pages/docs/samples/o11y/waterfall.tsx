"use client";

import { useAui, AuiProvider } from "@assistant-ui/store";
import { SpanResource } from "@assistant-ui/react-o11y";
import { mockSpans } from "./mock-spans";
import { WaterfallTimeline } from "./waterfall-timeline";
import { ClientOnly } from "./client-only";

function WaterfallInner() {
  const aui = useAui({ span: SpanResource({ spans: mockSpans }) });

  return (
    <AuiProvider value={aui}>
      <WaterfallTimeline />
    </AuiProvider>
  );
}

export function WaterfallSample() {
  return (
    <ClientOnly minHeight={300}>
      <WaterfallInner />
    </ClientOnly>
  );
}
