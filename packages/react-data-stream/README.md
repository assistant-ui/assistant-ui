# `@assistant-ui/react-data-stream`

Data Stream protocol integration for `@assistant-ui/react`. Connects an assistant-ui runtime to any backend that speaks the AI SDK data-stream or UI-message-stream wire format.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-data-stream
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream";

export function Provider({ children }: { children: React.ReactNode }) {
  const runtime = useDataStreamRuntime({ api: "/api/chat" });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

When `protocol` is omitted, the runtime detects `x-vercel-ai-data-stream: v1`
responses as the legacy data-stream wire format and
`x-vercel-ai-ui-message-stream: v1` responses as the UI message stream format.
Responses without a known marker still fall back to UI message stream for
compatibility. Set `protocol` explicitly only for custom endpoints that do not
preserve or expose the response marker.

## See also

- `@assistant-ui/react-ai-sdk` for direct Vercel AI SDK integration with frontend tool forwarding.
- `useCloudRuntime` (also exported from this package) for managed thread persistence backed by `assistant-cloud`.

Full API reference at [assistant-ui.com/docs/api-reference/integrations/react-data-stream](https://www.assistant-ui.com/docs/api-reference/integrations/react-data-stream).
