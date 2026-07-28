---
"@assistant-ui/store": minor
"@assistant-ui/core": minor
"@assistant-ui/react": minor
---

feat: property API for aui — nullary scope accessors are now properties (`aui.thread.getState()` instead of `aui.thread().getState()`); calling them still works but is deprecated. Accessors keep `source`/`query`/`name` selection metadata as properties; these are reserved names for scope methods. An unavailable scope's accessor no longer throws at selection time: `aui.thread` always succeeds and is always truthy, `.source` is null, and any other property read (or a call) throws — check availability via `aui.thread.source != null`. Accessor identity is binding-keyed: stable across renders without structural change, new on structural change — memoization keyed on an accessor now invalidates exactly when its binding changes.
