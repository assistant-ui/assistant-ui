---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: drop phantom branch siblings produced by AI SDK v6 `useChat`'s placeholder→server id swap. `BranchPicker` no longer shows `2/2` on streamed assistant turns the user never branched. closes #4037 and #4131.

`useAISDKRuntime` detects the swap as a same-length, single-position id change across a streaming render and flags the disappearing id via a new `unstable_temporaryMessageIds` adapter input on `ExternalStoreAdapter`. `onEdit` / `onReload` / `onNew` clear the comparison baseline so legitimate edit / reload / new-message branches remain in the repository as siblings.
