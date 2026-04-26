---
"@assistant-ui/core": patch
---

feat: add `custom` slot to `RemoteThreadMetadata` and `ThreadListItemState`

allows adapter authors to carry arbitrary backend session data through `list()` / `fetch()` and surface it on the thread list item state. matches the existing `custom: Record<string, unknown>` convention used on `ThreadMessage`, `RunConfig`, and `ChatModelRunResult`. consumers can intersect a typed shape at their own boundary, e.g. `RemoteThreadMetadata & { custom: { workspaceId: string } }`.
