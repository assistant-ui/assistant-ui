"use client";

import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { defineStates } from "./types";

const CREATED_AT = new Date("2026-09-26T12:00:00Z");

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="w-full text-sm leading-relaxed">
      <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
    </MessagePrimitive.Root>
  );
}

function Fixture({
  markdown,
  isRunning = false,
}: {
  markdown: string;
  isRunning?: boolean;
}) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: [
      {
        id: "assistant-1",
        role: "assistant",
        content: markdown,
        createdAt: CREATED_AT,
      },
    ],
    isRunning,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="bg-background w-full max-w-2xl rounded-xl border p-5">
        <ThreadPrimitive.Messages
          components={{ AssistantMessage, UserMessage: AssistantMessage }}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}

const STREAMING = `## Retry with backoff

Wrap the call so a failed request waits a little longer each time:

\`\`\`ts
async function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();`;

const CODE = `Add the provider at the root of your app:

\`\`\`tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";

export function App({ runtime }) {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
\`\`\`

Then run \`pnpm dev\` and open **localhost:3000**.`;

const GFM = `### Launch checklist

- [x] Pricing page copy approved
- [x] Stripe products created
- [ ] ~~Blog post~~ moved to next week
- [ ] Announce in #general

1. Merge the release branch
2. Tag \`v2.4.0\`
3. Watch error rates for an hour

> Rollback is one click from the deployments page.

---

Questions go to [the launch doc](https://example.com/launch).`;

const WIDE_TABLE = `Here is how the plans compare:

| Plan | Monthly price | Annual price | Seats | Messages per month | SSO | Audit log | Support |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Free | $0 | $0 | 1 | 500 | No | No | Community |
| Pro | $20 | $192 | 5 | 10,000 | No | 30 days | Email, 2 business days |
| Team | $60 | $576 | 25 | 50,000 | Yes | 1 year | Email, same day |
| Enterprise | Custom | Custom | Unlimited | Unlimited | Yes | Unlimited | Dedicated channel |`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The reply is mid-stream, cut off inside an open code block.",
    Component: () => <Fixture markdown={STREAMING} isRunning />,
  },
  {
    key: "code-block",
    label: "Code block",
    note: "A fenced block gets a language header and a copy button.",
    Component: () => <Fixture markdown={CODE} />,
  },
  {
    key: "gfm",
    label: "Rich lists",
    note: "Task lists, strikethrough, ordered lists, quotes, and rules in one reply.",
    Component: () => <Fixture markdown={GFM} />,
  },
  {
    key: "long-content",
    label: "Wide table",
    note: "A table wider than the message scrolls sideways inside its wrapper.",
    Component: () => <Fixture markdown={WIDE_TABLE} />,
  },
]);
