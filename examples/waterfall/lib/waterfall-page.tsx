"use client";

import { AuiProvider, AuiConfig } from "@assistant-ui/store";
import { SpanResource } from "@assistant-ui/react-o11y";
import { mockSpans } from "./mock-data";
import { WaterfallTimeline } from "./waterfall-timeline";

const config = AuiConfig({
  span: SpanResource({ spans: mockSpans }),
});

export function WaterfallPage() {
  return (
    <AuiProvider config={config}>
      <WaterfallTimeline />
    </AuiProvider>
  );
}
