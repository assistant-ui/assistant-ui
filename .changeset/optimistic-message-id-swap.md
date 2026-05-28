---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run (#4037).

Messages can now be flagged `metadata.isOptimistic`, and the external-store sync drops optimistic messages whose id is no longer present in the latest snapshot. The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one, the stale placeholder is removed instead of lingering as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff (#4040), this only removes explicitly-optimistic messages, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.
