---
"@assistant-ui/core": patch
---

fix: `ExternalThread` no longer reports an empty thread while it is loading

`ExternalThread` computed `thread.isEmpty` as `messages.length === 0`, omitting
the `isLoading` term that `thread-runtime-client.ts` already applies. A thread
with `isLoading: true` and no messages yet reported `isEmpty: true`, so
`<ThreadPrimitive.Empty>`, `useThreadIsEmpty()`, and `AuiIf` on
`s.thread.isEmpty` rendered their empty state underneath the loading indicator.
The `ThreadState` type already documents the intended contract: a thread is
empty when it has no messages and is not loading.

Both producers now define `isEmpty` identically. Consumers that pass
`isLoading` to `ExternalThread` and render empty-state UI will see that UI stay
hidden until loading finishes. `useExternalStoreRuntime` is unaffected — it
already carried the `isLoading` term.
