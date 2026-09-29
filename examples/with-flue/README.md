# assistant-ui + Flue

This example is a complete chat app: assistant-ui renders the interface, `@assistant-ui/react-flue` connects it to one durable Flue conversation, and Flue streams a real OpenAI response from the server.

## Run it

```bash
pnpm install
cp examples/with-flue/.env.example examples/with-flue/.env.local
# Add your OPENAI_API_KEY to examples/with-flue/.env.local
pnpm --filter with-flue dev
```

Open [http://localhost:5173](http://localhost:5173), then send a message, attach an image, or select a suggestion. The conversation id is stored in the browser, so a reload reconnects to the same durable history. Use **New conversation** to generate a fresh id.

The default model is `openai/gpt-4o-mini`. Set `MODEL_SPECIFIER` in `.env.local` to use another model supported by Flue, together with that provider's server-side environment variable.

## Client setup

The browser only needs the durable conversation URL. The API key never enters this bundle:

```tsx title="src/ui/runtime-provider.tsx"
"use client";

import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
} from "@assistant-ui/react";
import { useFlueRuntime } from "@assistant-ui/react-flue";
import { useMemo, type PropsWithChildren } from "react";

export function FlueRuntimeProvider({
  conversationId,
  children,
}: PropsWithChildren<{ conversationId: string }>) {
  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );
  const runtime = useFlueRuntime({
    url: `/api/agents/chat/${conversationId}`,
    adapters,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

Render the normal assistant-ui thread inside that provider:

```tsx
<FlueRuntimeProvider conversationId={conversationId}>
  <Thread />
</FlueRuntimeProvider>
```

## Server setup

The Flue agent selects the model. Flue reads `OPENAI_API_KEY` from the server environment and owns execution, streaming, tools, and durable history:

```ts title="src/agents/chat.ts"
"use agent";

import { useModel } from "@flue/runtime";

export function ChatAgent() {
  useModel(process.env.MODEL_SPECIFIER ?? "openai/gpt-4o-mini");
  return "You are a helpful assistant.";
}
```

Mount it at the route used by the client:

```ts title="src/app.ts"
app.route("/api/agents/chat", createAgentRouter(ChatAgent));
```

The routes in this demo are intentionally unauthenticated and are only suitable for local development. Production Flue applications should protect the agent mount with application middleware.
