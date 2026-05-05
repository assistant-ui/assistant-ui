---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Add cursor-based pagination to the thread list. `RemoteThreadListAdapter.list()` accepts an optional `{ after }` cursor and may return `nextCursor` on the response. The runtime exposes `loadMore()`, `hasMore`, and `isLoadingMore` through both the legacy `ThreadListRuntime` API and the tap-only `aui.threads()` path; `ThreadListRuntimeCore.loadMore?()`, `hasMore?`, and `isLoadingMore?` are optional, so non-paginating cores (local, external-store, single-thread, in-memory) remain conformant.

`@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button built on `createActionButton`, plus a `useThreadListLoadMore` primitive hook. Consumers wanting an `IntersectionObserver` sentinel can read `s.threads.hasMore` / `isLoadingMore` from `useAuiState` and call `aui.threads().loadMore()` directly.

In-flight `loadMore()` calls dedup via a single promise. The existing `_loadGeneration` counter drops stale append callbacks when a `reload()` interleaves a `loadMore()`. The loadMore reducer captures the active adapter so a mid-flight adapter swap cannot leak a stale page. Empty-string `nextCursor` is normalised to `undefined`. `reload()` pre-clears the cursor so consumers reading `hasMore` directly during a reload do not observe a stale value.

Adapter rejections are surfaced via `console.error` in both the initial-load and `loadMore` paths, matching the pattern in `RemoteThreadListHookInstanceManager` and `useToolInvocations`.
