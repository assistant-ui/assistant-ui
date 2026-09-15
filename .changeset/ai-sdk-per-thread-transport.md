---
"@assistant-ui/ai-sdk": patch
---

fix: clone AssistantChatTransport per thread in useChatThread

A single `AssistantChatTransport` passed to `useChatRuntime` was shared across every thread `useRemoteThreadListRuntime` keeps mounted. Because each `useChatThread` wires the transport (`setRuntime`, `getThreadListItem`) during render, the wiring was last-writer-wins: a streaming thread re-rendering on each chunk could re-point the shared transport, so another thread's request went out with the wrong `remoteId` and model context. `useChatThread` now clones an `AssistantChatTransport` per thread — mirroring what `AISDKThreads` already does — so each thread's wiring is private. A caller-owned chat (the `AISDKThreads` path) still uses the supplied instance, since it already clones and binds the chat to it.
