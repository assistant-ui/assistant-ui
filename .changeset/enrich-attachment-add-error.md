---
"@assistant-ui/core": patch
---

feat: enrich `composer.attachmentAddError` event with typed payload

The event now carries `{ reason, message, attachmentId?, error? }` so subscribers can branch on the failure mode (`no-adapter` / `not-accepted` / `adapter-error`). The bridge no longer relies on a `findLast` heuristic to recover the failed attachment id.

Several state-derivable events are now annotated `@deprecated` because they duplicate state observation: `composer.send`, `composer.attachmentAdd`, `thread.runStart`, `thread.runEnd`, `thread.initialize`, `threadListItem.switchedTo`, `threadListItem.switchedAway`. They continue to fire for backward compatibility; new code should observe state via `useAuiState` instead.
