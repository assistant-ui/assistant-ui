---
"@assistant-ui/react-langgraph": patch
---

feat: register `onRefetchThread`, so `threads.reloadMainThread()` refetches in place instead of remounting the runtime hook. The load effect body moves into a shared `runLoad(purpose)` with one `AbortController` per in-flight load. A refetch keeps existing messages rendered, leaves `values` and staged `setState` alone, and swaps run-scoped state atomically only once the fresh result lands, touching nothing if it fails. A refetch that arrives while the initial load is still in flight defers to it, a new run supersedes an in-flight refetch, and one still in flight at unmount is aborted.
