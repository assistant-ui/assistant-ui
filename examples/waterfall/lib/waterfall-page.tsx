"use client";

import { useAui, AuiProvider } from "@assistant-ui/store";
import { SpanResource } from "@assistant-ui/react-o11y";
import { mockSpans } from "./mock-data";
import { WaterfallTimeline } from "./waterfall-timeline";

export function WaterfallPage() {
  const aui = useAui({
    span: SpanResource({ spans: mockSpans }),
  });

  return (
    <AuiProvider value={aui}>
      <WaterfallTimeline />
    </AuiProvider>
  );
}
