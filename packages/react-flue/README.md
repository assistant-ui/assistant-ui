# `@assistant-ui/react-flue`

Connect a durable [Flue](https://flueframework.com/) conversation to assistant-ui.

## Install

```sh
pnpm add @assistant-ui/react-flue @assistant-ui/react
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useFlueRuntime } from "@assistant-ui/react-flue";

export function RuntimeProvider({
  conversationId,
  children,
}: {
  conversationId: string;
  children: React.ReactNode;
}) {
  const runtime = useFlueRuntime({
    url: `/api/agents/support/${conversationId}`,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

Install `@flue/sdk` directly and pass a memoized Flue client when the conversation needs authentication or custom headers:

```sh
pnpm add @flue/sdk
```

```tsx
import { createFlueClient } from "@flue/sdk";
import { useMemo } from "react";

const client = useMemo(
  () =>
    createFlueClient({
      url: `/api/agents/support/${conversationId}`,
      token,
    }),
  [conversationId, token],
);
const runtime = useFlueRuntime({ client });
```

The adapter renders Flue text, reasoning, tool calls, files, and `data-*` parts. It also forwards cancellation to the conversation's `abort` route. Flue currently accepts image attachments only; configure assistant-ui with `SimpleImageAttachmentAdapter` when the composer should upload images.

Flue clients address one caller-owned conversation URL. Conversation enumeration, titles, and deletion remain application concerns and are not added by this adapter.

See [`examples/with-flue`](../../examples/with-flue) for a runnable offline demo.
