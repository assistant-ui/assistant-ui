# `@assistant-ui/cloud-ai-sdk` Architecture

This document explains the current structure and runtime flow of `packages/cloud-ai-sdk`.
It is focused on the big picture: what owns state, how data moves, and where to debug.

## 1) Big Picture

`cloud-ai-sdk` is the standalone bridge between:

- AI SDK chat runtime (`@ai-sdk/react` `useChat` + `Chat`)
- Cloud persistence/thread APIs (`assistant-cloud`)

It does **not** depend on `@assistant-ui/react` runtime primitives.

```text
UI Components
   |
   v
useCloudChat() -------------------------------> useThreads()
   |                                              |
   |                                              +-- thread list CRUD + selection state
   |
   +-- useCloudChatCore() -> CloudChatCore
   |       |
   |       +-- ThreadSessionManager (dedupe thread creation)
   |       +-- MessagePersistence (persist/load message history)
   |       +-- TitlePolicy (generate title once)
   |
   +-- useChatRegistry() -> ChatRegistry
   |       |
   |       +-- active Chat instance by thread/session key
   |
   +-- useChat({ chat: activeChat })
           |
           +-- send/regenerate/stream helpers returned to caller
```

## 2) Source Layout

```text
packages/cloud-ai-sdk/src/
├── chat/
│   ├── useCloudChat.ts            # Main hook orchestration
│   ├── useCloudChatCore.ts        # Core lifecycle wiring in React
│   ├── useChatRegistry.ts         # Active chat/session selection
│   ├── ChatRegistry.ts            # Chat + metadata maps
│   ├── MessagePersistence.ts      # ai-sdk/v6 format + cloud persistence adapter
│   ├── useCloudChat.test.tsx
│   ├── useCloudChat.switch.test.tsx
│   └── useChatRegistry.test.tsx
├── core/
│   ├── CloudChatCore.ts           # Domain logic used by useCloudChat
│   ├── ThreadSessionManager.ts    # Concurrent create-thread dedupe
│   ├── TitlePolicy.ts             # One-time title generation policy
│   └── CloudChatCore.test.ts
├── threads/
│   ├── useThreads.ts              # Thread state + CRUD/actions
│   ├── generateThreadTitle.ts     # Cloud title generation helper
│   └── useThreads.test.tsx
├── __tests__/contract/
│   ├── persistence.test.ts
│   ├── threadLifecycle.test.ts
│   └── titlePolicy.test.ts
├── types.ts
└── index.ts
```

## 3) Primary Runtime Flow (`useCloudChat`)

```text
useCloudChat(options)
  |
  +-- 1. Resolve cloud
  |      external threads.cloud OR explicit cloud OR env auto-cloud
  |
  +-- 2. Resolve thread store
  |      external threads OR internal useThreads({ cloud })
  |
  +-- 3. Build/refresh CloudChatCore via useCloudChatCore
  |      - recreate core when cloud identity changes
  |      - update core.options each render
  |      - set mountedRef + base transport
  |
  +-- 4. Resolve active Chat via useChatRegistry
  |      - selected thread -> thread chat key
  |      - no selected thread -> fresh session key
  |
  +-- 5. Load persisted messages when selected thread changes
  |
  +-- 6. Bind active Chat to AI SDK
         useChat({ chat: activeChat })

returns: { ...useChatHelpers, threads }
```

## 4) Chat Identity Model

`ChatRegistry` tracks three things:

```text
chatByKey:      chatKey -> Chat instance
metaByKey:      chatKey -> { threadId, creatingThread, loading, loaded }
keyByThreadId:  threadId -> chatKey
```

`useChatRegistry` handles switching semantics:

- If `threadId` is selected, use that thread's chat key.
- If `threadId` becomes `null`, rotate to a **fresh session key**.
- This prevents reusing old chat state for a new unsaved conversation.

## 5) Message Send + Persistence Flow

When user sends a message:

```text
CloudChatCore.createTransport(chatKey).sendMessages()
  |
  +-- ensureThreadId(chatKey)
  |      - if thread exists, reuse
  |      - else create once (deduped by ThreadSessionManager)
  |      - select new thread in threads + refresh list
  |
  +-- persist user messages strictly
  |      persist(..., { roles: ["user"], strict: true })
  |
  +-- forward to base transport.sendMessages(...)
```

When assistant finishes:

```text
CloudChatCore.createChat(...).onFinish
  |
  +-- user onFinish callback
  +-- persist full chat history
  +-- TitlePolicy: generate title once for newly created threads
```

## 6) Thread Loading Flow

Thread hydration happens in `useThreadMessageLoader` (`useCloudChat.ts`):

```text
on selected threadId:
  chatKey = registry.getChatKeyForThread(threadId) ?? threadId
  meta = registry.getOrCreateMeta(chatKey, threadId)

  if already loaded/loading/messages exist:
    mark loaded and exit

  else:
    meta.loading = core.loadThreadMessages(...)
      -> load persisted messages
      -> set chat.messages
      -> mark loaded
      -> route errors via onSyncError
```

Cancellation is handled through a local `cancelledRef` so stale async loads do not hydrate after unmount/switch.

## 7) `useThreads` Responsibility Boundary

`useThreads` owns thread UI state and CRUD operations:

- `threads`, `threadId`, `isLoading`, `error`
- `refresh`, `get`, `create`, `delete`, `rename`, `archive`, `unarchive`, `selectThread`, `generateTitle`

`useCloudChat` consumes this API but does not own list CRUD state itself.

## 8) State Ownership Summary

```text
useThreads state (list + selected thread)
        ^
        | consumed/mutated by
        |
CloudChatCore options.threads
        |
        +-- thread creation side effects (select/refresh)
        +-- title generation trigger

ChatRegistry state (chat instances + per-chat metadata)
        |
        +-- determines active Chat for useChat
        +-- tracks loading/creating dedupe

AI SDK useChat state (messages/status/error/controls)
        |
        +-- returned from useCloudChat to app UI
```

## 9) Key Invariants

1. One thread creation per chat key at a time.
2. New chat session key is rotated when leaving a selected thread.
3. Thread hydration is lazy and guarded against duplicate loads.
4. User messages are persisted before network send (strict mode).
5. Auto-title runs once per newly created thread after assistant output.

## 10) Tests and What They Protect

```text
src/chat/useChatRegistry.test.tsx
  - chat key reuse and fresh-session rotation behavior

src/chat/useCloudChat*.test.tsx
  - hook wiring and thread switch behavior

src/core/CloudChatCore.test.ts
  - core orchestration behaviors

src/__tests__/contract/*.test.ts
  - behavior-level invariants across refactors

src/threads/useThreads.test.tsx
  - thread action/error handling behavior
```

## 11) Debugging Order

When behavior looks wrong, inspect in this order:

1. `src/chat/useCloudChat.ts`
2. `src/chat/useCloudChatCore.ts`
3. `src/chat/useChatRegistry.ts` + `src/chat/ChatRegistry.ts`
4. `src/core/CloudChatCore.ts` + `src/core/ThreadSessionManager.ts` + `src/core/TitlePolicy.ts`
5. `src/chat/MessagePersistence.ts`
6. `src/threads/useThreads.ts`

This follows the same direction data moves at runtime.
