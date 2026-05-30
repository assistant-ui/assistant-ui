---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run (#4037).

Messages can now be flagged `metadata.isOptimistic`. Optimistic messages are treated as ephemeral: they only ever live on the current head branch (the repository evicts off-branch optimistic messages whenever the head moves) and they are never written to persisted state (`export()` omits them). The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one mid-run, the stale placeholder no longer lingers as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff (#4040), only explicitly-optimistic messages are affected, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.
