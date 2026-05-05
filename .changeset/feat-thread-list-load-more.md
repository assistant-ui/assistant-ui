---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat(core): add `loadMore()` to `ThreadListRuntime` for cursor-based thread list pagination. `RemoteThreadListAdapter.list()` now accepts an optional `{ after }` cursor and may return `nextCursor` on the response; `aui.threads().loadMore()` invokes the adapter with the stored cursor and appends the next page, exposing `hasMore` and `isLoadingMore` on the threads state. `ThreadListRuntimeCore.loadMore?()` is optional, so non-paginating cores (local, external-store, single-thread) remain conformant. The same `_loadGeneration` guard used by `reload()` drops stale append callbacks when a `reload()` interleaves a `loadMore()`, and the loadMore reducer captures the active adapter so an adapter swap mid-flight cannot leak a stale page into the new adapter's state. `@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button plus a `useThreadListLoadMore()` hook; consumers wanting an intersection-observer sentinel can wrap the button at the application layer.
