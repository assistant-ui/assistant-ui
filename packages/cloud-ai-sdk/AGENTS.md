# @assistant-ui/cloud-ai-sdk

> Part of assistant-ui monorepo. See root [AGENTS.md](../../AGENTS.md) for build commands.

React hooks bridging Vercel AI SDK (`useChat`) with [`assistant-cloud`](../cloud/AGENTS.md) persistence. Works without the full `@assistant-ui/react` runtime.

## Structure

```
src/
├── chat/
│   ├── useCloudChat.ts         # Main hook — orchestrates cloud + AI SDK
│   ├── useCloudChatCore.ts     # React lifecycle wrapper for CloudChatCore
│   ├── useChatRegistry.ts      # Manages Chat instances by thread/session key
│   ├── ChatRegistry.ts         # Chat instance store (non-React)
│   └── MessagePersistence.ts   # Encodes/decodes UIMessage for cloud storage
├── core/
│   ├── CloudChatCore.ts        # Orchestrator — persistence, thread creation, title gen
│   ├── ThreadSessionManager.ts # Deduplicates concurrent thread creation
│   └── TitlePolicy.ts          # One-time auto-title for new threads
├── threads/
│   ├── useThreads.ts           # Thread list CRUD hook
│   └── generateThreadTitle.ts  # Cloud API call for title generation
├── types.ts                    # Shared types (UseCloudChatOptions, ChatMeta, etc.)
└── index.ts                    # Public exports
```

## Key Concepts

**Auto-cloud singleton** — Created from `NEXT_PUBLIC_ASSISTANT_BASE_URL` env var at module load. Enables zero-config anonymous auth.

**Two-layer pattern** — `useCloudChatCore` (React lifecycle) wraps `CloudChatCore` (pure logic). The hook manages creation, syncing, and cleanup of the core instance across renders.

**Chat registry** — `ChatRegistry` + `useChatRegistry` manage multiple chat instances keyed by thread or session ID. Switching threads reuses existing instances.

**Thread auto-creation** — First message triggers thread creation in the transport layer. `ThreadSessionManager` deduplicates concurrent creation promises (no duplicates).

**External vs internal threads** — `useCloudChat()` creates its own `useThreads` internally. Pass `{ threads }` from an external `useThreads()` to share thread state across components (e.g., sidebar + chat).

**Title generation** — Happens automatically as a side effect of message persistence (`onFinish`), not an explicit API call. `TitlePolicy` ensures it fires only once per thread.
