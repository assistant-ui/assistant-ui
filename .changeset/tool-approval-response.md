---
"@assistant-ui/core": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react": patch
---

feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`.
