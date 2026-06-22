# `@assistant-ui/react-o11y`

Headless React primitives for rendering span and trace UIs (waterfalls, timelines, run inspectors) on top of `@assistant-ui/store`. Ships a tap-based `SpanResource` that owns the data and a set of unstyled `SpanPrimitive.*` components for laying it out.

## Installation

```bash
npm install @assistant-ui/react-o11y
```

## Usage

```tsx
"use client";

import { AuiProvider, useAui } from "@assistant-ui/store";
import { SpanPrimitive, SpanResource } from "@assistant-ui/react-o11y";

const spans = [
  { id: "a", parentSpanId: null, name: "request", type: "http", status: "completed", startedAt: 0, endedAt: 120, latencyMs: 120 },
  { id: "b", parentSpanId: "a", name: "db query", type: "db", status: "completed", startedAt: 10, endedAt: 80, latencyMs: 70 },
];

export function Waterfall() {
  const aui = useAui({ span: SpanResource({ spans }) });
  return (
    <AuiProvider value={aui}>
      <SpanPrimitive.Timeline className="relative h-8">
        <SpanPrimitive.Children>
          {() => (
            <SpanPrimitive.TimelineBar className="top-1 h-6 rounded bg-blue-500" />
          )}
        </SpanPrimitive.Children>
      </SpanPrimitive.Timeline>
    </AuiProvider>
  );
}
```

`SpanPrimitive.*` components rendered inside `<AuiProvider>` cover rows, indentation, names, status, collapse controls, and timeline bars. `SpanPrimitive.Timeline` provides the time range for its children; `SpanPrimitive.TimelineBar` positions each current span with CSS variables such as `--span-timeline-left` and `--span-timeline-width`. Running bars use the timeline range max unless you pass an explicit `now` timestamp for live ticking.

See [`examples/waterfall`](https://github.com/assistant-ui/assistant-ui/tree/main/examples/waterfall) for a complete waterfall implementation.
