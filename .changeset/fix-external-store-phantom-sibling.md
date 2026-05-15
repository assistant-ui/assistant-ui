---
"@assistant-ui/react": patch
---

fix: `useExternalStoreRuntime` no longer leaves phantom assistant siblings when the external store swaps a message id between syncs (e.g. AI SDK v6 `useChat` replacing a client-generated id with a server-provided id mid-stream, surfacing as `BranchPicker` showing `2/2` on a turn the user never branched). The `messages`-array sync path now diffs against the previous sync and removes ids that disappeared, matching the `messageRepository` path's snapshot semantics. Closes #4037.
