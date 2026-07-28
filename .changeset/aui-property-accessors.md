---
"@assistant-ui/store": minor
"@assistant-ui/core": minor
"@assistant-ui/react": minor
---

feat: property API for aui — nullary scope accessors are now properties (`aui.thread.getState()` instead of `aui.thread().getState()`); calling them still works but is deprecated. Selection meta moved off the accessor onto a hidden symbol, read via the new `getAuiMeta(accessor)` export (`accessor.source`/`accessor.query` no longer exist). Accessor identity is binding-keyed: stable across renders without structural change, new on structural change — memoization keyed on an accessor now invalidates exactly when its binding changes.
