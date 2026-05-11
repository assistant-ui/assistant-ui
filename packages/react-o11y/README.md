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
import { SpanResource } from "@assistant-ui/react-o11y";

const spans = [
  { id: "a", parentSpanId: null, name: "request", type: "http", status: "completed", startedAt: 0, endedAt: 120, latencyMs: 120 },
  { id: "b", parentSpanId: "a", name: "db query", type: "db", status: "completed", startedAt: 10, endedAt: 80, latencyMs: 70 },
];

export function Waterfall() {
  const aui = useAui({ span: SpanResource({ spans }) });
  return (
    <AuiProvider value={aui}>
      <Timeline />
    </AuiProvider>
  );
}
```

Compose `SpanPrimitive.*` components inside `<Timeline>` to render rows, indentation, names, status, and the collapse toggle.

See [`examples/waterfall`](https://github.com/assistant-ui/assistant-ui/tree/main/examples/waterfall) for a complete waterfall implementation.
