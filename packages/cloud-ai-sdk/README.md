# @assistant-ui/cloud-ai-sdk

Standalone AI SDK hooks for `assistant-cloud` persistence. No runtime surface — just hooks.

## What this package provides

- **`useCloudChat`** — Chat + thread persistence with optional auto-title generation.
- **`useThreads`** — Thread CRUD, selection, and title generation.

## Internal Architecture

`useCloudChat` is organized around two layers:

1. **`useChatRegistry`**
   Tracks active `Chat` instances by thread/session and reuses them across switches.

2. **`useCloudChatCore`** — React lifecycle wrapper that creates, syncs, and manages the `CloudChatCore` instance.

3. **Thread loading** (`useThreadMessageLoader` helper in `useCloudChat`)
   Loads thread history when a thread is selected; delegates to `CloudChatCore.loadThreadMessages`.

Supporting internals:

- **`CloudChatCore`** — Orchestrates persistence (`MessagePersistence`), thread creation (`ThreadSessionManager`), and title generation (`TitlePolicy`).
- **`MessagePersistence`** — Encodes/decodes `UIMessage` to cloud format.
- **`ThreadSessionManager`** — Deduplicates concurrent thread creation.
- **`TitlePolicy`** — One-time auto-title generation for new threads.

## Package boundary

This package is standalone. It depends on:

- `assistant-cloud` — Persistence and auth API client.
- `@ai-sdk/react` / `ai` — Peer dependencies for Chat and transport types.

It does **not** depend on `@assistant-ui/react` or `@assistant-ui/react-ai-sdk`.

## Configuration

- **Zero-config:** Set `NEXT_PUBLIC_ASSISTANT_BASE_URL`.
- **Explicit cloud:** `useCloudChat({ cloud })`.
- **External thread store:** `useCloudChat({ threads })` with a `useThreads` result.
